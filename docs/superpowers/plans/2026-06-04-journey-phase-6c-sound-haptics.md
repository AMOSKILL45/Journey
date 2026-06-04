# Phase 6C — Sound + Haptics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A settings-gated `@features/feedback` module — sound (`expo-audio`) + haptics (`expo-haptics`) reading a local Zustand/AsyncStorage settings store — that wires the muted 6A `playUnlockSfx` and makes the haptics toggle actually work.

**Architecture:** One source of truth for prefs (`useFeedbackSettings`, read imperatively via `getState()`); `playSfx`/`haptics.*` gate on it; `expo-audio` is lazily `require()`d in a try/catch (crash-safe on builds without it); the SFX manifest is empty until real CC0 files land.

**Tech Stack:** Zustand v5 + `zustand/middleware` persist, AsyncStorage, expo-audio (new native dep), expo-haptics (already in build), NativeWind, i18n-js, Jest + RNTL.

**Spec:** `docs/superpowers/specs/2026-06-04-journey-phase-6c-sound-haptics-design.md`

**Plan-time refinements (vs spec):**

- Module is **`@features/feedback`** (per spec). The spec's "`PixelButton` fires `haptics.light()`" is **deferred** — `PixelButton` is `@shared` and importing `@features/feedback` would invert the dependency graph. Haptics are wired at **feature** call sites (`MilestoneNode`, achievement unlock) which may import features. (A DS-wide button haptic can come later by relocating the store/haptics to `@core`.)
- Volume = stepped control (no slider dep), per ADR 6C-8.

**Conventions to mirror:** zustand → `src/features/realtime/store/presenceStore.ts`; AsyncStorage → `src/features/achievements/seenSet.ts`; settings Toggle idiom → `src/features/notifications/components/NotificationSettings.tsx`; contract test → `src/features/passport/__tests__/contracts.test.ts`. Validate inline: `npm run typecheck && npm run lint && npm test`. Agents do NOT git-commit (main session commits).

---

## File structure

```
src/features/feedback/
  store/feedbackSettings.ts    # Zustand+persist store + initReduceMotion()
  soundManifest.ts             # SOUND_IDS vocab + SOUND_CATEGORY + (empty) soundAssets
  sound.ts                     # playSfx / playMusic / stopMusic / setAudioSuppressed (lazy expo-audio)
  haptics.ts                   # light/selection/medium/success/error (gated)
  components/FeedbackSettings.tsx
  index.ts                     # barrel
  __tests__/{feedbackSettings,soundManifest,sound,haptics,FeedbackSettings,contracts}.test.ts(x)
src/features/achievements/sound.ts   # rewire playUnlockSfx → playSfx + haptics.success (Modify)
src/features/milestones/components/MilestoneNode.tsx  # raw Haptics → haptics wrapper (Modify)
src/app/(tabs)/profile.tsx           # render <FeedbackSettings/> (Modify)
src/app/_layout.tsx                  # initReduceMotion() on mount (Modify)
src/core/i18n/locales/{en,fr}.json   # feedback.* (Modify)
package.json / app config            # add expo-audio (Modify)
```

---

## Task 1: Add the `expo-audio` native dependency

**Files:** Modify `package.json` (+ lockfile, + app config if the installer adds a plugin)

- [ ] **Step 1: Install** — `npx expo install expo-audio` (use `dangerouslyDisableSandbox: true` if the sandbox blocks the npm registry; CLAUDE.md notes `--cache $TMPDIR/npm-cache` may be needed).
- [ ] **Step 2: Verify** — `grep expo-audio package.json` shows a version pinned by the SDK-54 install. Confirm no `expo-av` was added.
- [ ] **Step 3: Note (no build)** — do NOT run `eas build` (owner batches native builds). This dep ships in the next build; the code is lazy-guarded so the current OTA build stays crash-safe.
- [ ] **Step 4: Commit** `chore(feedback): add expo-audio native dep (6C)`.

---

## Task 2: Settings store + `initReduceMotion`

**Files:** Create `src/features/feedback/store/feedbackSettings.ts`, `__tests__/feedbackSettings.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { useFeedbackSettings } from '../store/feedbackSettings';

const reset = () =>
  useFeedbackSettings.setState({
    sfxEnabled: true,
    uiSoundsEnabled: false,
    musicEnabled: false,
    masterVolume: 0.6,
    hapticsEnabled: true,
    osReduceMotion: false,
  });

describe('feedbackSettings', () => {
  beforeEach(reset);
  it('has the spec defaults', () => {
    const s = useFeedbackSettings.getState();
    expect(s.sfxEnabled).toBe(true);
    expect(s.uiSoundsEnabled).toBe(false);
    expect(s.musicEnabled).toBe(false);
    expect(s.masterVolume).toBe(0.6);
    expect(s.hapticsEnabled).toBe(true);
  });
  it('setters update fields', () => {
    useFeedbackSettings.getState().setSfx(false);
    useFeedbackSettings.getState().setVolume(0.25);
    useFeedbackSettings.getState().setHaptics(false);
    const s = useFeedbackSettings.getState();
    expect(s.sfxEnabled).toBe(false);
    expect(s.masterVolume).toBe(0.25);
    expect(s.hapticsEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run → fail** `npm test -- feedbackSettings`
- [ ] **Step 3: Implement**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FeedbackState {
  sfxEnabled: boolean;
  uiSoundsEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  hapticsEnabled: boolean;
  osReduceMotion: boolean;
  setSfx: (v: boolean) => void;
  setUiSounds: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  setVolume: (v: number) => void;
  setHaptics: (v: boolean) => void;
  setOsReduceMotion: (v: boolean) => void;
}

export const useFeedbackSettings = create<FeedbackState>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      uiSoundsEnabled: false,
      musicEnabled: false,
      masterVolume: 0.6,
      hapticsEnabled: true,
      osReduceMotion: false,
      setSfx: (v) => set({ sfxEnabled: v }),
      setUiSounds: (v) => set({ uiSoundsEnabled: v }),
      setMusic: (v) => set({ musicEnabled: v }),
      setVolume: (v) => set({ masterVolume: v }),
      setHaptics: (v) => set({ hapticsEnabled: v }),
      setOsReduceMotion: (v) => set({ osReduceMotion: v }),
    }),
    {
      name: 'feedback.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        sfxEnabled: s.sfxEnabled,
        uiSoundsEnabled: s.uiSoundsEnabled,
        musicEnabled: s.musicEnabled,
        masterVolume: s.masterVolume,
        hapticsEnabled: s.hapticsEnabled,
      }),
    },
  ),
);

/** Seed + subscribe to the OS Reduce Motion accessibility setting. Returns an unsubscribe. */
export function initReduceMotion(): () => void {
  void AccessibilityInfo.isReduceMotionEnabled().then((v) =>
    useFeedbackSettings.getState().setOsReduceMotion(v),
  );
  const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
    useFeedbackSettings.getState().setOsReduceMotion(v),
  );
  return () => sub.remove();
}
```

- [ ] **Step 4: Run → pass. Commit** `feat(feedback): settings store + reduce-motion init (6C)`.

---

## Task 3: `soundManifest.ts` + test

**Files:** Create `src/features/feedback/soundManifest.ts`, `__tests__/soundManifest.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { SOUND_CATEGORY, SOUND_IDS, soundAssets } from '../soundManifest';

describe('soundManifest', () => {
  it('every id has a category', () => {
    SOUND_IDS.forEach((id) => expect(['ui', 'event']).toContain(SOUND_CATEGORY[id]));
  });
  it('soundAssets only references declared ids', () => {
    Object.keys(soundAssets).forEach((id) => expect(SOUND_IDS).toContain(id));
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
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

// require() entries are added here when real CC0 files land in src/assets/sounds/.
// Empty until then so Metro never bundles a missing asset; playSfx() no-ops on absent ids.
export const soundAssets: Partial<Record<SoundId, number>> = {};
```

- [ ] **Step 4: Run → pass. Commit** `feat(feedback): sound manifest (6C)`.

---

## Task 4: `sound.ts` + test

**Files:** Create `src/features/feedback/sound.ts`, `__tests__/sound.test.ts`

- [ ] **Step 1: Failing test** (mock expo-audio + the manifest so one asset exists)

```ts
const play = jest.fn();
const createAudioPlayer = jest.fn(() => ({ play, volume: 0, loop: false, remove: jest.fn() }));
jest.mock('expo-audio', () => ({ createAudioPlayer }), { virtual: true });
jest.mock('../soundManifest', () => ({
  SOUND_IDS: ['coin_unlock'],
  SOUND_CATEGORY: { coin_unlock: 'event' },
  soundAssets: { coin_unlock: 1 },
}));

import { useFeedbackSettings } from '../store/feedbackSettings';
import { playSfx, setAudioSuppressed } from '../sound';

describe('sound.playSfx', () => {
  beforeEach(() => {
    createAudioPlayer.mockClear();
    play.mockClear();
    setAudioSuppressed(false);
    useFeedbackSettings.setState({ sfxEnabled: true, masterVolume: 0.6, uiSoundsEnabled: false });
  });

  it('plays an event sound at master volume when enabled', () => {
    playSfx('coin_unlock');
    expect(createAudioPlayer).toHaveBeenCalledWith(1);
    expect(play).toHaveBeenCalled();
  });
  it('no-ops when the category is disabled', () => {
    useFeedbackSettings.setState({ sfxEnabled: false });
    playSfx('coin_unlock');
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });
  it('no-ops while audio is suppressed (sensitive flow)', () => {
    setAudioSuppressed(true);
    playSfx('coin_unlock');
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
import { useFeedbackSettings } from './store/feedbackSettings';
import { SOUND_CATEGORY, soundAssets, type SoundId } from './soundManifest';

let suppressed = false;
export function setAudioSuppressed(v: boolean): void {
  suppressed = v;
}

interface AudioModule {
  createAudioPlayer: (source: number) => {
    play: () => void;
    remove: () => void;
    volume: number;
    loop: boolean;
  };
}
function loadAudio(): AudioModule | null {
  try {
    return require('expo-audio') as AudioModule;
  } catch {
    return null; // native module absent on this build → silent
  }
}

export function playSfx(id: SoundId): void {
  if (suppressed) return;
  const asset = soundAssets[id];
  if (asset === undefined) return; // no file yet
  const s = useFeedbackSettings.getState();
  const enabled = SOUND_CATEGORY[id] === 'event' ? s.sfxEnabled : s.uiSoundsEnabled;
  if (!enabled) return;
  const audio = loadAudio();
  if (!audio) return;
  try {
    const player = audio.createAudioPlayer(asset);
    player.volume = s.masterVolume;
    player.play();
  } catch {
    /* ignore playback errors */
  }
}

let musicPlayer: { remove: () => void } | null = null;
export function playMusic(asset: number): void {
  const s = useFeedbackSettings.getState();
  if (!s.musicEnabled) return;
  const audio = loadAudio();
  if (!audio) return;
  try {
    stopMusic();
    const player = audio.createAudioPlayer(asset);
    player.loop = true;
    player.volume = s.masterVolume;
    player.play();
    musicPlayer = player;
  } catch {
    /* ignore */
  }
}
export function stopMusic(): void {
  try {
    musicPlayer?.remove();
  } catch {
    /* ignore */
  }
  musicPlayer = null;
}
```

- [ ] **Step 4: Run → pass. Commit** `feat(feedback): sound manager (lazy expo-audio) (6C)`.

---

## Task 5: `haptics.ts` + test

**Files:** Create `src/features/feedback/haptics.ts`, `__tests__/haptics.test.ts`

- [ ] **Step 1: Failing test**

```ts
const impactAsync = jest.fn();
const notificationAsync = jest.fn();
const selectionAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

import { useFeedbackSettings } from '../store/feedbackSettings';
import { haptics } from '../haptics';

describe('haptics', () => {
  beforeEach(() => {
    impactAsync.mockClear();
    notificationAsync.mockClear();
    selectionAsync.mockClear();
    useFeedbackSettings.setState({ hapticsEnabled: true, osReduceMotion: false });
  });

  it('fires the mapped feedback when enabled', () => {
    haptics.light();
    haptics.success();
    expect(impactAsync).toHaveBeenCalledWith('light');
    expect(notificationAsync).toHaveBeenCalledWith('success');
  });
  it('no-ops when haptics disabled', () => {
    useFeedbackSettings.setState({ hapticsEnabled: false });
    haptics.medium();
    expect(impactAsync).not.toHaveBeenCalled();
  });
  it('no-ops when OS reduce-motion is on', () => {
    useFeedbackSettings.setState({ osReduceMotion: true });
    haptics.error();
    expect(notificationAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
import * as Haptics from 'expo-haptics';

import { useFeedbackSettings } from './store/feedbackSettings';

function on(): boolean {
  const s = useFeedbackSettings.getState();
  return s.hapticsEnabled && !s.osReduceMotion;
}

export const haptics = {
  light: () => {
    if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  selection: () => {
    if (on()) void Haptics.selectionAsync();
  },
  medium: () => {
    if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success: () => {
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error: () => {
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
```

- [ ] **Step 4: Run → pass. Commit** `feat(feedback): haptics wrapper (6C)`.

---

## Task 6: `FeedbackSettings` component + barrel + test

**Files:** Create `src/features/feedback/components/FeedbackSettings.tsx`, `src/features/feedback/index.ts`, `__tests__/FeedbackSettings.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { useFeedbackSettings } from '../store/feedbackSettings';
import { FeedbackSettings } from '../components/FeedbackSettings';

describe('FeedbackSettings', () => {
  beforeEach(() =>
    useFeedbackSettings.setState({ sfxEnabled: true, masterVolume: 0.6, hapticsEnabled: true }),
  );
  it('toggles sfx via the store', () => {
    const { getByLabelText } = render(<FeedbackSettings />);
    fireEvent.press(getByLabelText('Sound effects')); // jest loads real en.json (see 6A convention)
    expect(useFeedbackSettings.getState().sfxEnabled).toBe(false);
  });
  it('sets volume via a step', () => {
    const { getByTestId } = render(<FeedbackSettings />);
    fireEvent.press(getByTestId('vol-0.25'));
    expect(useFeedbackSettings.getState().masterVolume).toBe(0.25);
  });
});
```

> jest loads the real locales, so the Toggle's `accessibilityLabel={t('feedback.sfx')}` renders `"Sound effects"`. This test therefore depends on Task 7's i18n keys — when executing inline (all files written, then validated) that holds; if running tasks in strict order, do Task 7 before this test.

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** the component (mirror the `NotificationSettings` `Toggle` idiom) + a stepped volume row:

```tsx
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { useFeedbackSettings } from '../store/feedbackSettings';

const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

function Toggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      className="flex-row items-center justify-between py-2"
    >
      <PixelText size="body">{label}</PixelText>
      <View
        className={`h-6 w-11 rounded-full border-2 border-border ${value ? 'bg-secondary-500' : 'bg-surface-alt'}`}
      />
    </Pressable>
  );
}

export function FeedbackSettings() {
  const { t } = useTranslation();
  const s = useFeedbackSettings();
  return (
    <View className="gap-1">
      <PixelText size="h2" className="mb-2">
        {t('feedback.settings.title')}
      </PixelText>
      <Toggle
        label={t('feedback.sfx')}
        value={s.sfxEnabled}
        onToggle={() => s.setSfx(!s.sfxEnabled)}
      />
      <Toggle
        label={t('feedback.uiSounds')}
        value={s.uiSoundsEnabled}
        onToggle={() => s.setUiSounds(!s.uiSoundsEnabled)}
      />
      <Toggle
        label={t('feedback.music')}
        value={s.musicEnabled}
        onToggle={() => s.setMusic(!s.musicEnabled)}
      />
      <Toggle
        label={t('feedback.haptics')}
        value={s.hapticsEnabled}
        onToggle={() => s.setHaptics(!s.hapticsEnabled)}
      />
      <View className="flex-row items-center justify-between py-2">
        <PixelText size="body">{t('feedback.volume')}</PixelText>
        <View className="flex-row gap-1">
          {VOLUME_STEPS.map((step) => (
            <Pressable
              key={step}
              testID={`vol-${step}`}
              accessibilityRole="button"
              onPress={() => s.setVolume(step)}
              className={`h-6 w-6 rounded border-2 border-border ${
                step > 0 && s.masterVolume >= step ? 'bg-accent-500' : 'bg-surface-alt'
              }`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Barrel** `index.ts`:

```ts
export { useFeedbackSettings, initReduceMotion } from './store/feedbackSettings';
export { playSfx, playMusic, stopMusic, setAudioSuppressed } from './sound';
export { haptics } from './haptics';
export { FeedbackSettings } from './components/FeedbackSettings';
export { SOUND_IDS, type SoundId } from './soundManifest';
```

- [ ] **Step 5: Run → pass. Commit** `feat(feedback): settings panel + barrel (6C)`.

---

## Task 7: i18n (`feedback.*`, en + fr)

**Files:** Modify `src/core/i18n/locales/en.json`, `src/core/i18n/locales/fr.json`

- [ ] **Step 1: Add** to both (insert as a top-level key after the opening `{`):

```jsonc
"feedback": {
  "settings": { "title": "Sound & Haptics" },   // fr: "Son & vibrations"
  "sfx": "Sound effects",                         // fr: "Effets sonores"
  "uiSounds": "UI sounds",                        // fr: "Sons d'interface"
  "music": "Music",                               // fr: "Musique"
  "haptics": "Haptics",                           // fr: "Vibrations"
  "volume": "Volume"                              // fr: "Volume"
}
```

- [ ] **Step 2: Validate** `npm test -- i18n` (en/fr parity stays green).
- [ ] **Step 3: Commit** `feat(feedback): i18n en+fr (6C)`.

---

## Task 8: Wiring — achievement unlock, MilestoneNode, Profile, root

**Files:** Modify `src/features/achievements/sound.ts`, `src/features/milestones/components/MilestoneNode.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/_layout.tsx`

- [ ] **Step 1: Wire the 6A unlock hook** — replace `src/features/achievements/sound.ts` body:

```ts
import { haptics, playSfx } from '@features/feedback';

// 6C: achievement unlock = fanfare SFX + success haptic (both settings-gated).
export function playUnlockSfx(_rarity: string): void {
  playSfx('achievement_fanfare');
  haptics.success();
}
```

- [ ] **Step 2: Refactor MilestoneNode haptics** — in `MilestoneNode.tsx`: remove `import * as Haptics from 'expo-haptics'`, add `import { haptics } from '@features/feedback'`, and replace the three calls: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` → `haptics.error()`; `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` → `haptics.light()`; `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` → `haptics.medium()`. Run `npm test -- MilestoneNode` (the wrapper still calls expo-haptics, so an existing expo-haptics mock keeps passing; update the mock to `@features/feedback` if the test mocks the import directly).
- [ ] **Step 3: Profile panel** — in `profile.tsx`, add below the `NotificationSettings` card:

```tsx
<PixelCard padding="lg" className="mb-6">
  <FeedbackSettings />
</PixelCard>
```

and `import { FeedbackSettings } from '@features/feedback';`.

- [ ] **Step 4: Root init** — in `_layout.tsx`, add `import { initReduceMotion } from '@features/feedback';` and a `useEffect(() => initReduceMotion(), [])` (it returns its own unsubscribe).
- [ ] **Step 5: Typecheck** `npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(feedback): wire unlock SFX+haptic, MilestoneNode, Profile, root (6C)`.

---

## Task 9: Contract tests + validation + docs

**Files:** Create `src/features/feedback/__tests__/contracts.test.ts`; Modify `CLAUDE.md`

- [ ] **Step 1: Write contract tests**

```ts
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { SOUND_IDS } from '../soundManifest';

const SRC = path.join(__dirname, '../../..');
const FEATURE_DIR = path.join(__dirname, '..');

function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && !e.name.startsWith('.')) out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

describe('feedback runtime contracts', () => {
  it('every static t("feedback.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]feedback\.([a-zA-Z0-9_.]+)[`'"]/g)) {
        keys.add(`feedback.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every playSfx("…") id used in the codebase is a declared SoundId', () => {
    const ids = new Set<string>();
    for (const f of walk(SRC)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/playSfx\(\s*['"]([a-z_]+)['"]/g)) {
        ids.add(m[1]);
      }
    }
    ids.forEach((id) => expect(SOUND_IDS as readonly string[]).toContain(id));
  });
});
```

- [ ] **Step 2: Run all** `npm run typecheck && npm run lint && npm test` → all PASS.
- [ ] **Step 3: Update `CLAUDE.md`** — mark Phase 6C done (mirror 6A/6B): feedback module (settings store + sound manager + haptics wrapper + settings panel), expo-audio native dep (needs EAS build to hear; lazy-guarded), MilestoneNode refactor, unlock SFX+haptic wired, empty manifest (real audio = asset task), updated test count. Note **PHASE 6 COMPLETE (6A–6C)**.
- [ ] **Step 4: Commit** `feat(feedback): contract tests + docs — Phase 6C complete`.

---

## Self-Review

**Spec coverage:** §2 ADRs → 6C-1 (Task 1 expo-audio), 6C-2 (Task 2 local store), 6C-3 (module layout), 6C-4 (Task 3 empty manifest), 6C-5 (Task 4 lazy require), 6C-6 (getState reads in Tasks 4/5), 6C-7 (Task 5 + Task 8 MilestoneNode), 6C-8 (Task 6 stepped volume). §3 store → Task 2. §4 sound → Tasks 3/4. §5 haptics → Task 5. §6 wiring → Task 8 (PixelButton haptic deferred — noted up top). §7 native/OTA → Task 1. §8 i18n/assets → Task 7 (+ empty manifest Task 3). §9 tests → Tasks 2-6 unit, Task 9 contracts.

**Placeholder scan:** No "TBD/TODO". Empty `soundAssets` + deferred PixelButton haptic + deferred onboarding prompt are documented design choices, not gaps.

**Type consistency:** `useFeedbackSettings` (Task 2) read by `sound.ts` (4), `haptics.ts` (5), `FeedbackSettings` (6). `SoundId`/`SOUND_CATEGORY`/`soundAssets` (Task 3) used by `sound.ts` (4) + contract (9). `playSfx`/`haptics`/`setAudioSuppressed`/`FeedbackSettings`/`initReduceMotion` exported by the barrel (6) and consumed in Task 8. `playSfx('achievement_fanfare')` ∈ `SOUND_IDS` ✅ (Task 3).
