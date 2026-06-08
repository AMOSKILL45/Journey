# Rive — animated characters (prep, activate at next EAS build)

Goal: little characters that **move** (idle breathing, walk along the path, react on check-in)
on the overworld + a Home mascot. Decision (2026-06-09): **Rive** over Lottie — ~60fps vs
~17fps in RN, ~2KB vs ~24KB files, and animation states (idle/walk/jump) live **inside the
`.riv` file** as a state machine (no animation code). Avatars themselves are already real
(DiceBear, static, OTA) — Rive adds _motion_.

> **Why this is a doc, not code yet:** `rive-react-native` is a **native module**. Metro can't
> bundle an `import 'rive-react-native'` until the package is installed, so this can't ship OTA
> like DiceBear did — it needs a fresh **EAS build**. Everything below is ready to drop in the
> moment you decide to build.

## 1. Install + config (native → needs a build, NOT OTA)

```bash
npm install rive-react-native
```

Add the Expo config plugin in `app.config.ts` `plugins` (Rive ships one for the native setup):

```ts
'rive-react-native',
```

Then **rebuild**: `eas build --profile production --platform ios` (and android). It will NOT work
via `eas update` — the native Rive runtime must be in the binary.

## 2. Where the characters go

| Surface                                                                  | Animation                                                      | Source of the character                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Overworld avatar** (on the current milestone node, `LiveAvatarsLayer`) | idle "breathing" loop; optional walk when moving between nodes | one shared `.riv` with a `color`/`skin` input so each traveler differs |
| **Home / empty states** (replaces the static greeting area)              | a waving mascot                                                | a single mascot `.riv`                                                 |
| **Check-in / boss clear**                                                | a celebrate state triggered by a state-machine input           | reuse the avatar `.riv`                                                |

Recommended: ONE `traveler.riv` with a state machine (`Idle`/`Walk`/`Celebrate`) + a numeric
input for skin/color, driven from the traveler's `avatar_sprite_id`/`avatar_color`. One asset,
every traveler differs.

## 3. Sourcing `.riv` files (free → paid)

- **Rive Community** (https://rive.app/community) — thousands of free, remixable files; search
  "character", "avatar", "mascot". Check each file's license on its page.
- **Rive editor** (free) — make/retarget your own; export `.riv`. Best for an on-brand pixel
  character matching the Cozy Arcade palette.
- **Commission** — a Rive designer can build the exact adventurer with idle/walk/celebrate states.

Drop files in `src/assets/rive/` and `require()` them (or load by `resourceName`).

## 4. Ready-to-drop component (paste after install + build)

```tsx
// src/shared/components/RiveCharacter/RiveCharacter.tsx
import Rive, { Fit, Alignment } from 'rive-react-native';
import { View } from 'react-native';

export interface RiveCharacterProps {
  /** require('@assets/rive/traveler.riv') */
  source: number;
  stateMachineName?: string; // e.g. 'Traveler'
  size?: number;
}

export function RiveCharacter({
  source,
  stateMachineName = 'Traveler',
  size = 64,
}: RiveCharacterProps) {
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rive
        source={source}
        stateMachineName={stateMachineName}
        fit={Fit.Contain}
        alignment={Alignment.Center}
        autoplay
      />
    </View>
  );
}
```

Wire it in `LiveAvatarsLayer` behind a small flag so DiceBear stays the fallback:

```tsx
// pseudo: const Avatar = RIVE_ENABLED ? RiveCharacter : PixelAvatar;
```

Keep `PixelAvatar` (DiceBear) as the static fallback for the member list / small sizes — Rive is
best reserved for the hero overworld character + mascot (perf + asset cost).

## 5. Interim "it moves" WITHOUT a build (optional, OTA)

If you want a taste of motion before the Rive build: add a gentle **Reanimated** idle bob to the
overworld avatars (translateY oscillation, respecting reduced-motion). Pure JS → OTA. Not a real
character animation, but the little avatars "breathe". Ask and I'll wire it into `LiveAvatarsLayer`.

## 6. Credit

When a `.riv` is added: credit its author + license in `CREDITS.md` (the `credits:check` CI
requires `rive-react-native` to be listed too once installed).

## Checklist to activate

- [ ] `npm install rive-react-native` + add the config plugin to `app.config.ts`
- [ ] Source/build a `traveler.riv` (Idle/Walk/Celebrate states + skin input) → `src/assets/rive/`
- [ ] Add `RiveCharacter` (§4) + flag it into `LiveAvatarsLayer` (DiceBear fallback)
- [ ] `eas build` (native — not OTA) → verify on device
- [ ] Credit the `.riv` + `rive-react-native` in `CREDITS.md`
