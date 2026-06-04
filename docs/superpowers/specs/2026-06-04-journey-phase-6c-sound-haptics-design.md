# Phase 6C — Sound + Haptics — Design

> Sensory feedback: a settings-gated sound system (event SFX, UI blips, chiptune music) on
> `expo-audio`, and a haptics wrapper on `expo-haptics` that finally honors a user toggle + the iOS
> accessibility setting. Wires the muted `playUnlockSfx` hook 6A left behind.
>
> Date: 2026-06-04 · Status: approved design, pre-plan · Lens: architecture / ADRs
> Builds on: `expo-haptics` (already in the build, used raw by `MilestoneNode`), 6A `playUnlockSfx`
> stub, `profiles.preferences` pattern (4C — but see ADR 6C-2). **New native dep `expo-audio` → real
> sound needs the next EAS build.**

## 1. Context

Master spec §6.9 (Haptics & Sound): haptics mapping (light=button, selection=toggle, medium=milestone,
success=achievement, error=form; "Reduce haptics" toggle + respect iOS); sound defaults (UI **OFF**,
event **ON if opted in**, music **OFF**, master volume **60%**); **NEVER sound during sensitive flows**;
8-10 SFX (Kenney CC0) + 4-6 chiptune loops. Feature #17 Settings (sound, haptics). 6A left
`src/features/achievements/sound.ts` `playUnlockSfx()` as a no-op for this phase.

Phase 6C is the third and final Phase-6 sub-project (6A ✅ · 6B ✅ · **6C**). **`expo-haptics` is already
in the running build** (`MilestoneNode` ships it) so haptics/settings/UI are OTA-safe; **`expo-audio` is
new and native** so audible sound arrives with the next EAS build.

**Product decisions (owner, 2026-06-04):**

1. **`expo-audio`** (SDK 54 modern replacement for the now-deprecated `expo-av`).
2. **Settings stored locally** (Zustand + AsyncStorage) — per-device, instant reads (sound plays often),
   no DB round-trip/migration.
3. Event **SFX default ON** (easily muted); the onboarding "Want sound?" prompt is **deferred** (defaults
   - a settings panel cover it).

```
imperative call site (achievement unlock / button press / milestone reach)
      │
      ▼
playSfx(id) / haptics.x()  ──reads──►  useFeedbackSettings.getState()  (Zustand, AsyncStorage-persisted)
      │ gate: category enabled? volume? suppressed? reduce-motion?         ▲
      ▼                                                                    │ FeedbackSettings panel writes
  expo-audio (lazy, try/catch) | expo-haptics                       (Profile)
```

## 2. Architecture Decision Records

| ADR                                         | Decision                                                                                             | Rationale                                                                                                                    | Consequence                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **6C-1** Audio lib                          | `expo-audio`, not `expo-av`.                                                                         | SDK 54 deprecated `expo-av`; `expo-audio` is supported, has volume + looping.                                                | Spec §6.9 reference to `expo-av` is superseded; new native dep.                                            |
| **6C-2** Local settings                     | Zustand store persisted to AsyncStorage (not `profiles.preferences`).                                | Per-device is the right model for audio; instant `getState()` reads (no network) for high-frequency `playSfx`; no migration. | Diverges from 4C's synced notif prefs — intentional; documented.                                           |
| **6C-3** One `feedback` module              | Sound + haptics + settings live together.                                                            | Spec groups them; they share one settings store + the "sensory feedback" concern.                                            | Consumers import `@features/feedback`.                                                                     |
| **6C-4** Empty-until-assets manifest        | `soundAssets: Partial<Record<SoundId, module>> = {}`; `playSfx` no-ops when an id has no asset.      | Metro bundles `require()`d assets at build time — referencing missing files breaks the build.                                | System ships fully wired + silent; adding audio = drop file + one manifest line (badge/stamp-art pattern). |
| **6C-5** Lazy, guarded expo-audio           | `expo-audio` is `require()`d inside `playSfx`/music in a try/catch.                                  | The native module may be absent on the current OTA build; must not crash.                                                    | Sound no-ops (not crashes) until the native build ships; JS is OTA-safe.                                   |
| **6C-6** Imperative settings read           | `playSfx`/`haptics.*` read `useFeedbackSettings.getState()`, not via hooks.                          | Called from non-React contexts (button press handlers, cinematic effects).                                                   | Store usable in/out of React; one source of truth.                                                         |
| **6C-7** Haptics wrapper replaces raw calls | A `haptics` wrapper gates on `hapticsEnabled && !osReduceMotion`; `MilestoneNode` refactors onto it. | Raw `Haptics.*` in `MilestoneNode` ignores the user setting today.                                                           | One gated entry point; the setting finally works.                                                          |
| **6C-8** Stepped volume (no slider dep)     | Master volume via a tappable stepped control (0/25/50/75/100), not a slider.                         | Avoids adding `@react-native-community/slider` (another native dep).                                                         | Coarser but dependency-free; 60% snaps to a step.                                                          |

## 3. Settings store `store/feedbackSettings.ts`

Zustand + `persist` (AsyncStorage, key `feedback.settings.v1`). Read imperatively via `getState()`.

| field             | type         | default                          |
| ----------------- | ------------ | -------------------------------- |
| `sfxEnabled`      | boolean      | `true`                           |
| `uiSoundsEnabled` | boolean      | `false`                          |
| `musicEnabled`    | boolean      | `false`                          |
| `masterVolume`    | number (0–1) | `0.6`                            |
| `hapticsEnabled`  | boolean      | `true`                           |
| `osReduceMotion`  | boolean      | `false` (runtime, not persisted) |

Actions: `setSfx`/`setUiSounds`/`setMusic`/`setVolume`/`setHaptics`/`setOsReduceMotion`. An
`initReduceMotion()` (called in root `_layout`) seeds `osReduceMotion` from
`AccessibilityInfo.isReduceMotionEnabled()` and subscribes to `reduceMotionChanged`.

## 4. Sound manager `sound.ts` + `soundManifest.ts`

```ts
// soundManifest.ts
export const SOUND_IDS = [
  'coin_unlock',
  'achievement_fanfare',
  'milestone_powerup',
  'button_blip',
  'toggle_click',
] as const;
export type SoundId = (typeof SOUND_IDS)[number];
export const SOUND_CATEGORY: Record<SoundId, 'ui' | 'event'> = {
  coin_unlock: 'event',
  achievement_fanfare: 'event',
  milestone_powerup: 'event',
  button_blip: 'ui',
  toggle_click: 'ui',
};
export const soundAssets: Partial<Record<SoundId, number>> = {}; // require() entries added with real files
```

`sound.ts`:

- `setAudioSuppressed(bool)` — toggled true by sign-in/privacy screens (sensitive-flow guard).
- `playSfx(id)`: return if suppressed → if no `soundAssets[id]` → if category disabled; else lazily
  `require('expo-audio')` (try/catch), create a player at `masterVolume`, play, release on finish.
- `playMusic(theme)` / `stopMusic()`: single looping player, only when `musicEnabled`; stop on blur.

## 5. Haptics wrapper `haptics.ts`

```ts
const on = () => {
  const s = useFeedbackSettings.getState();
  return s.hapticsEnabled && !s.osReduceMotion;
};
export const haptics = {
  light: () => on() && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), // button
  selection: () => on() && void Haptics.selectionAsync(), // toggle
  medium: () => on() && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), // milestone
  success: () => on() && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), // achievement
  error: () => on() && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), // form
};
```

**`MilestoneNode` refactors** its raw `Haptics.impactAsync(Light/Medium)` + `notificationAsync(Error)`
onto `haptics.light()`/`.medium()`/`.error()`.

## 6. Wiring

- 6A `achievements/sound.ts` `playUnlockSfx(rarity)` → calls `playSfx('achievement_fanfare')` (now audible).
- `PixelButton` fires `haptics.light()` on press (DS-wide, settings-gated; `haptic={false}` opt-out prop).
- `FeedbackSettings` panel on **Profile** (beside `NotificationSettings`): 4 toggles + stepped volume.
- Root `_layout` calls `initReduceMotion()` on mount.

## 7. Native / OTA reality

`expo-audio` added to `package.json` (+ config plugin if required). **Audible sound needs the next EAS
build** (batches with push/GPS). Lazy-guard (ADR 6C-5) keeps the current OTA build crash-safe (silent).
Haptics + settings + UI work OTA (`expo-haptics` already native). **No `eas build` run here** (owner
batches native builds).

## 8. i18n + assets

`feedback.*` (en+fr): `settings.title`, `sfx`, `uiSounds`, `music`, `haptics`, `volume`. Asset dirs
`src/assets/sounds/` + `src/assets/music/` + the manifest; **real CC0 audio files = asset task** (Kenney
SFX / Soundimage chiptune), credited in `CREDITS.md` when added.

## 9. Tests & non-goals

- **Store**: defaults; setters; persistence shape.
- **Sound** (mock `expo-audio`): `playSfx` no-ops when suppressed / category disabled / asset missing;
  plays at `masterVolume` when enabled + asset present; `setAudioSuppressed` gate.
- **Haptics** (mock `expo-haptics` + store): fires when on; no-ops when `hapticsEnabled=false` or
  `osReduceMotion=true`; correct expo-haptics call per method.
- **FeedbackSettings**: toggles flip store; volume steps.
- **Contract test**: `feedback.*` i18n keys resolve en+fr; every `playSfx('…')` id in code ∈ `SOUND_IDS`.
- **Non-goals**: onboarding "Want sound?" prompt (deferred); per-theme music picker UI; real audio
  files; background-audio / lock-screen controls; `expo-av`.
