# Phase 10 — Runtime Contracts Checklist

> Companion to `src/core/__tests__/runtimeContracts.test.ts`. The static tests fail in CI;
> the items below live in dashboards / on-device and must be verified by a human.

## Static contracts (automated — `runtimeContracts.test.ts`, 9 tests)

- [x] Every static `t('a.b')` key used in code resolves in **both** en.json + fr.json.
- [x] en ⟷ fr key parity (`keyParity.test.ts`).
- [x] Every `*_FN` / `invoke('name')` edge-function name has `supabase/functions/<name>/index.ts`.
- [x] Ghost sentinel UUID (`de1e7e00-0000-4000-8000-000000000000`) identical across all client
      copies **+** the migration SQL **+** the `delete-account` edge fn.
- [x] First-run gate redirect `/(onboarding)/intro` resolves to a route file.
- [x] `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` read in `@core/env` are mapped in `app.config.ts` extra.
- [x] Delete-confirmation magic word stays embedded in `account.delete.confirmLabel` (both locales) — `confirmWord.test.ts`.

## Dashboard contracts (manual — drift silently, set before launch)

- [ ] **EAS env**: set `EXPO_PUBLIC_PRIVACY_URL` + `EXPO_PUBLIC_TERMS_URL` in EAS (and local `.env`).
      Until set, the zod `.default('https://thisisthejourney.app/{privacy,terms}')` placeholders render.
      Verify: `eas env:list`.
- [ ] **Hosting**: the Privacy Policy + Terms pages must actually exist + be reachable at those URLs
      (App Store + Play Data Safety require live, linked policy URLs).
- [ ] **Supabase Edge secrets**: `delete-account` + `export-account-data` rely on the project's
      `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (shared with existing fns — already provisioned).
      Re-confirm after any project key rotation.

## Device contracts (manual — next EAS build; OTA can't exercise native)

- [ ] First-run gate: fresh install → intro carousel → sign-in → profile onboarding → app.
      Re-install resets `onboarding_intro_seen`.
- [ ] Pre-permission priming sheets appear **before** the OS prompt for notifications + location;
      "Not now" suppresses the OS prompt; "Allow" triggers it.
- [ ] Readable Mode: manual toggle swaps Press Start 2P → Fredoka; auto-engages at system font
      scale ≥ 150%. Verify at 100 / 150 / 200%.
- [ ] **Account deletion round-trip** (use a throwaway account): confirm dialog requires typing the
      magic word → account + PII gone, shared-trip content shows "Former traveller", co-member trips
      survive, sole-owner trips removed, app returns to sign-in.
- [ ] **Data export**: returns a JSON bundle, opens the OS share sheet, file contains the user's rows.
- [ ] VoiceOver/TalkBack: sprites/badges/stamps announce labels; carousel dots announce page; the
      delete row is announced as destructive.
