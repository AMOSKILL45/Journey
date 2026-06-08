# Runtime-contract dashboard checklist

Contracts that live in **third-party dashboards**, not the repo — so no static test can
verify them. Generated per the `auditing-runtime-contracts` skill (step 5). Each item, if
wrong, breaks a feature **silently in the production build** (env vars fail open; auth
config lives in GoTrue; live grants live in Postgres). Verify before each store submission.

Source of truth for env: **EAS-hosted env**, NOT `.env` (`.env` does NOT reach the build).
Run `eas env:list --environment production` and reconcile against the 12 `EXPO_PUBLIC_*`
keys in `app.config.ts`.

## 1. EAS environment variables (production profile)

| Var                                                   | Breaks if missing                                    | Severity | OTA-fixable?   |
| ----------------------------------------------------- | ---------------------------------------------------- | -------- | -------------- |
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`              | All data + auth (app dead)                           | P0       | runtime (yes)  |
| `EXPO_PUBLIC_MAPTILER_API_KEY`                        | Real map = blank tiles + milestone geocoding throws  | P2       | runtime (yes)  |
| `EXPO_PUBLIC_SENTRY_DSN`                              | Zero crash reporting in beta (silent)                | P2       | runtime (yes)  |
| `EXPO_PUBLIC_POSTHOG_API_KEY`                         | Zero analytics (silent)                              | P2       | runtime (yes)  |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`                   | Google Sign-In iOS dead — **build-time plugin gate** | P1       | **build only** |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `_IOS_CLIENT_ID` | Google Sign-In not configured                        | P1       | runtime (yes)  |
| `EXPO_PUBLIC_PRIVACY_URL` / `_TERMS_URL`              | Legal links → 404 (App Store + GDPR risk)            | P2       | runtime (yes)  |

- [ ] Supabase URL + anon key present (auth works in logs, so likely set — confirm anyway).
- [ ] **MapTiler key** present AND the installed build was produced _after_ it landed (a build
      that predates the key ships blank tiles). `extra.maptilerApiKey` is baked at build time.
- [ ] Sentry DSN + PostHog key present → crash/analytics flow during the beta.
- [ ] If Google Sign-In ships in v1.0: all three Google vars set **before** the next build
      (the `@react-native-google-signin` plugin is added at config-eval time only when
      `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is set). If deferred, hide the Google button.
- [ ] Privacy + ToS URLs set AND the pages are **hosted and resolve** (include the KB ToS
      disclaimer clause at `docs/superpowers/reference/kb-tos-disclaimer.md`).
- [ ] (cleanup) `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` has no runtime consumer — drop it unless a
      client Stripe flow is planned.

## 2. Supabase Auth URL configuration (Dashboard → Authentication → URL Configuration)

GoTrue only honors an `emailRedirectTo` that is on the Redirect URLs allowlist; otherwise it
falls back to **Site URL** (often `http://localhost:3000`) → the magic link opens localhost,
not the app. The client sends `thisisthejourney://auth/callback` (`auth.ts`, built from
`APP_SCHEME`).

- [ ] Add `thisisthejourney://auth/callback` (and `thisisthejourney://**`) to **Redirect URLs**.
- [ ] Set **Site URL** to a non-localhost value.
- [ ] Send a real magic link to the TestFlight build → confirm it opens the app (not Safari/localhost).
- [ ] (OAuth already round-trips per auth logs, implying the scheme is allowlisted for OAuth —
      the email magic-link entry is distinct, confirm it independently.)

## 3. Live RLS grants (Postgres — verify via Supabase MCP / SQL editor)

The P0 outage (2026-05-25 → fixed 2026-06-08, migration `20260608144426`). The repo side is
now guarded by `src/__tests__/rls-execute-grants-contract.test.ts`; this confirms the **live**
side matches.

- [ ] `authenticated` holds EXECUTE on `is_trip_member`, `is_trip_editor`,
      `reaction_target_trip`, `_capsule_is_open`:
      `sql
    SELECT p.proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS ok
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('is_trip_member','is_trip_editor','reaction_target_trip','_capsule_is_open');
    `
      All four must be `ok = true`.

## 4. On the next EAS build — on-device smoke

- [ ] Home/Trips load (no 403); create a trip + geocoded milestone → path renders on the overworld.
- [ ] Pinch-zoom on Map mode crosses into the real MapTiler tiles (overworld-first is by design).
- [ ] Tap a public-trip share link (`thisisthejourney://t/<token>`) → opens the public trip screen.
- [ ] Magic link opens the app; Apple Sign-In completes; Google Sign-In completes (if shipping).
- [ ] A crash test event arrives in Sentry; an analytics event arrives in PostHog.
