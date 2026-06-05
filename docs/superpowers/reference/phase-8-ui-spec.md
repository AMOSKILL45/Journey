# Phase 8 — UI Spec (Cozy Arcade)

> Concrete per-component UI guidance for the workflow build. Style = **Pixel Art / Cozy
> Arcade** (already the project's system). Uses existing tokens (`@core/theme`), fonts
> (`pixel` = Press Start 2P, `heading` = Fredoka, `body` = Nunito), and DS components
> (`PixelCard`, `PixelButton`, `PixelInput`, `PixelBottomSheet`, `PixelDialog`, `PixelChip`).
> Source: `/ui-ux-pro-max` (Pixel Art system + UX rules) applied to the Phase 8 spec.

## Cross-cutting UX rules (enforce in every component)

- **Reduced motion (High):** every animation has a static/instant fallback gated on the 6C
  `osReduceMotion` flag (cutscene, capsule reveal, encounter entrance, caravan banner).
- **Motion budget:** animate 1–2 key elements per view max. Enter `ease-out`, exit `ease-in`,
  exit ≈60–70% of enter duration. Micro-interactions 150–300ms, cinematic ≤2.5 s.
- **Touch:** all tappable ≥44×44pt; icon-only buttons get `accessibilityLabel` + `hitSlop`.
- **Icons:** vector only (Lucide / the existing sprite system). **No emoji as icons.**
- **Loading >300ms:** skeleton/shimmer, never a frozen/blank view (encounter fetch).
- **Empty states:** helpful copy + a CTA (capsules list, encounters none-found).
- **Numbers:** tabular figures for countdowns and distances (no layout shift).
- **Color is never the only signal:** sealed = lock icon + "Sealed" label, not just muted color.
- **Safe areas:** map overlays (caravan) clear the notch, gesture bar, and bottom nav.
- **Sheets:** scrim 40–60% (`text-primary` #0F1A2E at α≈0.5), animate from source,
  confirm-before-dismiss when there are unsaved edits, one primary CTA per screen.

---

## 8B — BossClearCinematic

- **Layout:** full-screen Skia overlay, scrim #0F1A2E α≈0.6. Center boss sprite; title
  `t('boss.cleared')` in `pixel` font, accent gold `#FFCB05` with `primary-700` #A41E2A
  outline; subtitle `t('boss.subtitle',{milestone})` in `heading`, cream `#FFF8EC`.
- **Motion:** enter ≈400ms (sprite scale 0.8→1 spring + fade) + a single coin/star burst
  (reuse the achievement burst). Auto-dismiss ≈2.5 s. Exit ≈250ms fade. One hero element only.
- **Reduced motion:** static composed frame, no burst, still auto-dismisses + skippable.
- **Interaction:** full-screen `Pressable` "tap to continue" (`accessibilityLabel` =
  `t('boss.skip')`), interruptible (tap → immediate `onDone`). `playSfx('boss_cleared')` +
  `haptics.success()` on appear.

## 8C — Time capsules

**CreateCapsuleSheet** (`PixelBottomSheet`)

- Visible labels (not placeholder-only): message (multiline `PixelInput`), trigger segmented
  control `Date | Milestone`, then a date picker **or** `MilestonePicker`, recipient as
  `PixelChip` row (`Everyone` + member avatars, single-select).
- One primary CTA `t('timeCapsules.create.seal')` (`primary-500`, press scale 0.97); cancel subtle.
- Slide-up, scrim 50%, swipe-down to dismiss, **confirm if message non-empty**. Inputs ≥44pt.

**SealedCapsuleCard** (`PixelCard`, surface-alt `#FCEFD5`)

- Lucide `lock` glyph + "Sealed" label + author avatar + `t('timeCapsules.opensIn',{days})`
  with **tabular** countdown. Disabled/locked semantics (distinct from a pressable open card).

**CapsuleReveal**

- When openable the card gains an accent glow + an `Open` CTA. Tap → Reanimated unwrap
  (scale + crossfade to the message), `playSfx('capsule_open')` + `haptics.medium()`. Exit
  faster than enter. Reduced motion → instant crossfade.
- **Empty state:** `t('timeCapsules.empty')` ("No capsules yet — seal a message to your
  future selves") + a Seal CTA.

## 8D — CaravanControls (map overlay)

- Floating pill cluster in the lower map area, **above** safe-area + bottom nav.
- States (one primary action each): `off` → "Lead caravan" (`secondary-500`); `leading` →
  "Leading · Stop" (`accent-500` + stop glyph); `following` → top banner
  `t('caravan.following',{name})` (`info` #3F76D6) + a clear **Break** button (not gesture-only).
- Pills ≥44pt, press opacity/scale feedback, `accessibilityLabel`, `haptics.selection()` on
  toggle. State transitions ≈200ms; banner slides in from top. Color + icon + label (never
  color alone) to convey lead/follow state.

## 8E — Random encounters

**SurpriseButton**

- A mystery "?" pixel box (`accent-500` gold), label `t('encounters.surprise')`, ≥44pt,
  `haptics.light()`. While fetching (>300ms) show a skeleton/shimmer, button disabled.

**EncounterCard** (modal card, animates from the button — `modal-motion`)

- Pixel banner `t('encounters.title')` ("RANDOM ENCOUNTER!"), category sprite (vector),
  name (`heading`), distance `{n} m` **tabular**. Two actions: **Add** (`primary-500` →
  `playSfx('encounter')` + `haptics.success()`, **never auto-adds**) + **Dismiss** (ghost).
- Enter scale+fade; reduced motion → fade only.
- **None-found:** `t('encounters.none')` ("No encounters nearby — try another spot").
- **Error/timeout:** `t('encounters.error')` + a **Retry** action (error-recovery).

## 8A — World-theme visuals

- Three gradient backdrops (sky `skyTopColor`→`skyBottomColor`, ground band, accent palette
  from spec §6.3). Placeholder gradient PNG now; real pixel-art is an asset task.
- All three new skies are **light** (`#A8D6FF`, `#FFD6E0`, `#5FCFE6`) → overlay node labels in
  `text-primary` #0F1A2E (contrast ≥4.5:1). Verify label contrast per theme at build time.
- Theme auto-derived from destination country (no manual picker this phase).
