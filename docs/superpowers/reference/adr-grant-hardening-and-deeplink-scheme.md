# ADR — Grant-hardening discipline & deep-link scheme single source

Status: Accepted (2026-06-08). Context: the post-build audit that found two latent P0s.

## Decision 1 — `REVOKE EXECUTE` only applies to pure trigger functions, never RLS predicates

**Context.** `20260525000003_security_hardening.sql` revoked `EXECUTE` from `anon, authenticated,
public` on `is_trip_member` / `is_trip_editor` to satisfy the Supabase advisor
`*_security_definer_function_executable`. Those two functions are **RLS predicates** (called
inside `pg_policies.qual`). Postgres evaluates a policy predicate **as the calling role** — even
a `SECURITY DEFINER` function still requires the caller to hold `EXECUTE` to _invoke_ it. So the
revoke 403'd every trip-scoped read (`permission denied for function is_trip_member`) — a total
data-layer outage (Home/Trips/Map/Realtime) latent for two weeks, invisible to tests that mock
Supabase or run synthetic RLS as a superuser (which bypasses the `EXECUTE` check).

**Decision.** Classify every helper function before revoking:

| Class                | Example                                                                        | `authenticated` EXECUTE             | Why                                                                        |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------- |
| **Pure trigger fn**  | `handle_new_user`, `handle_new_trip`, `set_updated_at`                         | **revoke** ✅                       | Triggers run with table-owner rights; never called via `/rpc` or a policy. |
| **RLS predicate fn** | `is_trip_member`, `is_trip_editor`, `reaction_target_trip`, `_capsule_is_open` | **keep** ❌ revoke                  | Evaluated as the caller inside a policy; revoking 403s the table.          |
| **Client RPC**       | `get_trip_member_profiles`, `evaluate_achievements`                            | **keep** (intentional advisor WARN) | Invoked directly from the client.                                          |

To satisfy the advisor for an RLS predicate, **accept the WARN** (it only exposes a boolean
membership check) — do **not** revoke from `authenticated`. The advisor is a false-positive for
this class.

**Enforcement.** `src/__tests__/rls-execute-grants-contract.test.ts` replays every GRANT/REVOKE
in the migration sequence and fails CI if any predicate fn ends without `authenticated` EXECUTE.
Live grants tracked in `runtime-contracts-dashboard-checklist.md` §3.

## Decision 2 — One `APP_SCHEME` constant; never hardcode the scheme literal

**Context.** `publicLink.ts` hardcoded `SCHEME = 'journey'` while `app.config.ts` registers
`thisisthejourney`. `buildPublicTripLink` therefore emitted `journey://t/<token>` — a URL the OS
never routes to the app. Public sharing was dead on device while CI was green: three tests
asserted the wrong literal, and the deep-link guard only grepped for the _literal_ scheme, so it
could not see a link assembled from a constant.

**Decision.** `src/core/env/scheme.ts` exports `APP_SCHEME`, the single source of truth. Every
client-built link derives from it (`AUTH_REDIRECT_URL`, `buildPublicTripLink`,
`buildInvitationScheme`). `app.config.ts` keeps the literal `scheme:` (it's the OS registration
point); the contract test **parses that literal and asserts it equals `APP_SCHEME`**, so the two
can't drift without a build-time import.

**Enforcement.** `src/__tests__/deep-links-contract.test.ts` now has two layers: (A) literal
scan, and (B) **built-output eval** — it calls the builders and asserts each OUTPUT uses the
registered scheme and resolves to a route. Runtime-built URLs can no longer pass CI while broken.

## Note — the "blank map" is design + assets, not a bug

The overworld-first crossfade (zoom 8 shows the stylized overworld; pinch past 9–11 reveals the
real MapTiler map) is the **intended Phase-3 aesthetic** — not a defect. The perceived blankness
is (a) near-empty test data (0 geocoded milestones → no path to draw) and (b) **placeholder art
everywhere**: milestone sprites are category-letter colored squares (`mountain.png` = "LMK"), the
overworld background is a gradient. The visual identity is code-complete (sprite wiring,
`EmptyState.spriteSource`, world themes) but starved of real art. "Make the UI _folle_" is an
**asset commission** (mascots + sprites + overworld tiles), not a code change — do not snap the
map zoom past the crossfade (it would destroy the signature look).
