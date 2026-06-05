# Phase 9 — UI Spec (Cozy Arcade)

> Per-component UI guidance for the workflow build. Style = **Pixel Art / Cozy Arcade**
> (existing system: `@core/theme` tokens, `pixel`/`heading`/`body` fonts, DS components
> `PixelCard`/`PixelButton`/`PixelChip`/`PixelDialog`/`PixelBottomSheet`). This phase's
> distinguishing concern is **trust/privacy UX** — the user must always understand exactly
> what becomes visible. Source: `/ui-ux-pro-max` applied to the Phase 9 spec.

## Cross-cutting trust rules (enforce everywhere)

- **Never color-only** (a11y High): every visibility state pairs an icon + label, not just a
  color — Lucide `Lock` (private), `Link2` (unlisted), `Eye` (public view), `ShieldCheck`
  (verified). `text-primary` #0F1A2E on light surfaces (contrast ≥4.5:1).
- **Confirm before going public** (privacy is significant, not destructive): switching a
  trip or profile from private → public opens a `PixelDialog` that **lists what becomes
  visible and what never does** before applying. No silent privacy changes.
- **Always state the boundary**: every public control carries a one-line explainer of the
  safe subset ("your path becomes viewable; docs, checklists & locations stay private").
- **Success feedback**: a brief toast/flash on a visibility change (`success-feedback`).
- **Empty states**: private profile / not-public trip get a friendly explainer, never a blank.
- **Read-only distinction**: the public trip view must _read_ as view-only (badge + banner +
  no action affordances), distinct from disabled.
- Touch ≥44pt, `accessibilityLabel` on icon controls, reduced-motion respected (minimal
  motion in this phase).

---

## 9A — VisibilityControl (`@features/trips`)

- **Segmented control** (one primary selection): `Lock Private` · `Link2 Unlisted` ·
  `Eye Public view`. Active segment = `primary-500` fill + icon + label (never color alone).
  A fourth `open_to_join` chip is **disabled** with a "v1.1" hint (`disabled-states`, opacity
  ~0.4, non-interactive).
- **Explainer line** under the control (`body`, `text-secondary`):
  `social.visibility.explainer` — "Anyone with the link can view your path. Documents,
  checklists, photos and live locations always stay private."
- **Confirm dialog** when moving from `private` → unlisted/public_view: `PixelDialog`
  titled `social.visibility.confirmTitle`, body = the safe-subset list, Confirm/Cancel.
- **Copy link** button (`Link2`, `accessibilityLabel="social.visibility.copyLink"`) — shown
  **only** when `visibility !== 'private'`; copies `buildPublicTripLink(share_token)` +
  success toast. ≥44pt.
- Owner/editor only; mounts in `TripDetailScreen` settings area.

## 9B — PublicTripScreen (`@features/trips`)

- **View-only signaling** (top): a persistent banner `social.public.viewOnly` ("You're
  viewing a shared trip") + an `Eye` **"view-only" badge** near the title. The screen has
  **no FAB, no check-in, no edit** — read-only distinct from disabled.
- **Content**: cover, trip name (`heading`), dates + destination (tabular dates), then the
  **path** via `PathView` in a `readOnly` mode (nodes render, but tapping a node does
  nothing / shows info only — no check-in handler).
- **Owner attribution**: `get_public_profile(owner_id)` → display name, or
  `social.public.anonymous` ("A traveler") if the owner isn't public.
- **Ask to join**: a **disabled** `PixelButton` `social.public.askToJoin` with a "coming
  soon" hint (v1.1) — visible affordance, clearly non-interactive.
- **Empty / not-public**: `social.public.notPublic` ("This trip isn't public") with a back
  affordance. **Loading >300ms** → skeleton path, not a blank.

## 9C — PublicProfileScreen (`@features/profile`)

- Hero: large `PixelAvatar` (sprite + color), display name (`heading`), `ShieldCheck`
  verified tick when `is_verified` (icon + "Verified" label, not color-only).
- Body: bio (`body`, wraps — no truncation), a **countries grid** (flag chips, reuse the
  passport flag util), badges row. Gender/age shown **only** if the RPC returned them
  (the user opted in) — otherwise omitted entirely.
- **Empty / private**: `social.profile.private` ("This profile is private").
- Reached via `(modals)/profile/[id]` (e.g. tapping a public trip's owner name).

## 9C — ProfileVisibilityToggle (settings, `@features/profile`)

- A single switch **"Make my profile public"** (`social.profile.makePublic`), **private by
  default**, ≥44pt, `accessibilityLabel`.
- **Persistent explainer** (`social.profile.publicNote`, always visible, not a placeholder):
  "Public shows your name, avatar, bio, countries and badges. Your phone, passport, legal
  name and age are **never** shared." — the what's-visible / what's-never line.
- **Confirm dialog** on enabling (private → public).
- **Progressive disclosure**: the optional sub-toggles `social.profile.showGender` /
  `social.profile.showAge` (writing `gender_visible_in_public` / `show_age_in_public`)
  appear **only when public is on** — don't overwhelm upfront.
- Success toast on change. Mounts in the profile settings screen.

## 9D — (no UI)

Empty v1.1 schema — no screens this phase.
