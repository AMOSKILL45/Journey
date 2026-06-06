# Phase 10 — UI Spec (10A onboarding · 10B states · 10C a11y)

> **Date**: 2026-06-06 · Companion to the Phase 10 design spec + ADR-010/011/012.
> Visual + interaction spec for the three UI surfaces. Grounded in the **existing** DS
> primitives — do not invent components.

## 0. Design language (recap — Cozy Arcade is the source of truth)

Tokens (`@core/theme/tokens.ts`): primary-500 `#E63946` / primary-600 `#C62A38` (text-on-btn) ·
secondary-500 `#2A9D8F` · accent-500 `#FFCB05` (coin) · cream `#FFF8EC` (bg) · surface `#FFFFFF` ·
text-primary `#0F1A2E` · text-secondary `#5E6779` · border `#0F1A2E`.
Fonts: `pixel`=PressStart2P (accent only) · `heading`=Fredoka · `body`=Nunito.

Reuse these components — **all already exist**: `PixelText` (size+family), `PixelButton`,
`PixelCard`, `PixelChip`, `PixelDialog`, `PixelBottomSheet`, `PixelInput`, `PixelAvatar`.

UX rules that govern this phase (from the ui-ux-pro-max pass):

- **Onboarding must be skippable** — Skip + Back always reachable; never a locked overlay.
- **Reduced-motion is High severity** — honor `osReduceMotion` (already in `@features/feedback`).
- **≤1–2 animated elements per view** — no parallax, no "animate everything".
- **`accessibilityRole` + `accessibilityLabel` on every interactive element** (High).
- **Active-state indicator** on the carousel dots; **destructive actions visually separated**.
- **Safe-area aware**; touch targets **≥44pt** (use `hitSlop` for small glyphs); **no emoji as icons**.

The pixel-art family is flagged "high contrast/strain" for a11y — **this is exactly why 10C
Readable Mode exists**. Pixel font is decoration-grade; legible type carries meaning.

---

## 1. 10A — First-run onboarding carousel

**Container**: full-screen `(onboarding)` route, `cream` bg, `SafeAreaView`. One primary CTA per
screen (`primary-action` rule).

**Per-screen layout (top → bottom):**

1. **Skip** — top-right text button (`PixelText` body-medium, text-secondary), `accessibilityLabel="Skip intro"`, ≥44pt hit area. Persists `onboarding_intro_seen` and routes to sign-in.
2. **Illustration** — ~45% height, pixel-art **placeholder** inside a `PixelCard` frame (asset task). `accessibilityLabel` per screen. One subtle ambient motion max (e.g. a drifting cloud / bobbing avatar) — **disabled under reduced-motion** (static frame).
3. **Heading** — `PixelText size="h2" family="heading"` (Fredoka). 2–4 words.
4. **Body** — `PixelText size="body"` (Nunito), 1–2 lines, ≤60 chars/line.
5. **Footer** — dots indicator (active = `primary-500`, inactive = `border` @ 20%) + `PixelButton` ("Next" → last screen "Get started").

**Interaction**: horizontal paging (FlatList `pagingEnabled` or PagerView) **and** the Next button (`gesture-alternative` — never gesture-only). Slide/crossfade ≤300ms, ease-out, **interruptible**; reduced-motion → instant page change. Dots reflect active page.

**Content (i18n `onboarding.*`):**
| # | Heading | Body | Pillar |
|---|---------|------|--------|
| 1 | Plan together | Create a trip, invite your friends, build the route as a team. | trips |
| 2 | Follow the path | Milestones become a Duolingo-style path across a game-world map. | milestones/overworld |
| 3 | Travel live | See each other's avatars move on the map in real time. | realtime |
| 4 | Private by default | You choose what's shared. Nothing is public unless you say so. | privacy → "Get started" |

**Flow**: intro carousel → sign-in → (existing) profile onboarding → app. Shown only when
`!onboarding_intro_seen && no session` (root layout gate).

**Pre-permission priming** — reusable `PrePermissionSheet` (`PixelBottomSheet`): sprite +
value-framed `PixelText` copy + two `PixelButton`s ("Allow" primary / "Not now" ghost). Shown
**before** the OS prompt. Two wirings:

- **Notifications**: "Get reminded about visas & trip prep — only when it matters." (before 4C `registration.ts` request)
- **Location**: "Let friends see your avatar move on the map. You control this anytime." (before 5B location request)
  No emoji; use existing sprites. `accessibilityLabel` on both buttons.

---

## 2. 10B — Empty / Loading / Error states

Three `@shared/components` primitives. APIs:

```tsx
<EmptyState  sprite={spriteId} title={t('…')} body={t('…')} actionLabel={t('…')} onAction={fn} />
<LoadingState variant="spinner" | "skeleton" label={t('common.loading')} />
<ErrorState  title={t('…')} body={t('…')} onRetry={fn} />
```

**EmptyState** (matches §6.7: sprite + sentence + **one** action): vertically centered, sprite
96–128px (`accessibilityLabel`), `PixelText h3` title + `body` (text-secondary), single
`PixelButton`. No second CTA.

**LoadingState**: for waits >300ms (`progressive-loading`). `skeleton` variant = pixel blocks
matching the list row shape (reserve space → no layout shift / CLS); `spinner` variant = a small
styled `ActivityIndicator` (or coin-spin under non-reduced-motion). `accessibilityLabel` announces
"Loading".

**ErrorState**: sad sprite + `PixelText h3` + body + "Retry" `PixelButton`. Container
`accessibilityLiveRegion="polite"` / `role="alert"` so SR announces it. Recovery path always
present (`error-recovery`).

**Consumers to convert** (audit found ~25 screens with ad-hoc patterns): trips list, path/empty
trip, documents, checklists, photos, polls, achievements, passport, inbox/notifications,
discover (v1.1 stub), smart-reminders, life-reminders, public profile. Each gets consistent
empty + loading + error via these three.

---

## 3. 10C — Accessibility

### Readable Mode (the precise mechanism — ADR-011)

`PixelText` already computes `resolvedFamily = family ?? sizeToDefaultFamily[size]`. Readable Mode
is a **single remap**: when active **and** `resolvedFamily === 'pixel'`, substitute
`'heading-bold'` (Fredoka 700 — **already bundled**). Everything already in Nunito/Fredoka is
untouched. No new font, **OTA-safe**.

```tsx
const readable = useReadableMode(); // store flag || auto
const base = family ?? sizeToDefaultFamily[size];
const resolvedFamily = readable && base === 'pixel' ? 'heading-bold' : base;
```

`useReadableMode()` returns `readableModeManual || readableModeAuto`, where `readableModeAuto` is
seeded once at app start from `PixelRatio.getFontScale() >= 1.5` (stored in `@features/feedback`).
Manual toggle lives in the new **`A11ySettings`** panel (grouped with reduce-motion + haptics).

### accessibilityLabel audit (icon-only / sprite controls)

Add labels to: `PixelButton` icon-only variants, `MilestoneNode`, `PixelAvatar`, sprite pickers,
FABs, modal close buttons, the carousel dots (`accessibilityRole="adjustable"` or labelled),
SurpriseButton, reaction buttons. Every meaningful sprite gets `accessibilityLabel`; decorative
ones get `accessibilityElementsHidden` / `importantForAccessibility="no"`.

### Contrast (WCAG AA — verify in the plan, fix failures)

| Pair                                         | Verdict                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| text-primary `#0F1A2E` on cream `#FFF8EC`    | ✅ ~15:1                                                           |
| primary-600 `#C62A38` text on white (button) | ✅ AA                                                              |
| text-secondary `#5E6779` on cream            | ✅ ~5.3:1 (AA body)                                                |
| **accent `#FFCB05` as text on cream/white**  | ❌ fails — accent only as fill/coin **with border**, never as text |
| Readable-mode body (Nunito) on surfaces      | re-verify @ ≥12pt                                                  |

### Touch targets & motion

- All interactive ≥44pt; small glyphs get `hitSlop`. `touch-spacing` ≥8pt.
- Reduced-motion: carousel, ambient sprites, coin-spinner, achievement cinematic all degrade to
  static/instant (most already do — fill gaps).

### Destructive separation (ties to 10E)

"Delete account" in Settings: in its own section, **`error`/`primary-700` danger color**, spatially
separated from normal settings rows (`destructive-nav-separation`); the confirm `PixelDialog` uses
a clearly destructive CTA + a non-default cancel.

---

## 4. Pre-delivery a11y checklist (App / RN)

- [ ] Every meaningful sprite/icon has `accessibilityLabel`; decorative ones hidden from SR.
- [ ] All interactive ≥44pt (hitSlop where needed); ≥8pt spacing.
- [ ] Reduced-motion honored on carousel + ambient + spinners (no parallax).
- [ ] Readable Mode swaps pixel→Fredoka; verified at font scale 100/150/200%.
- [ ] Color never the sole indicator (states pair icon/text).
- [ ] Onboarding fully skippable; Back reachable; dots show active page.
- [ ] Safe-area respected; no content under notch / home indicator / fixed bars.
- [ ] Delete-account visually + spatially separated, danger-colored, confirm dialog.
