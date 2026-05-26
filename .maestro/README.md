# Maestro smoke tests

End-to-end smoke tests that catch the bug class our Jest unit tests can't see:
runtime crashes, deep-link 404s, navigation regressions on the actual device/sim.

## Why we have these

Three bugs hit TestFlight on 2026-05-26 that Jest tests passed clean for:

1. **App crash on boot** — `EXPO_PUBLIC_*` env vars missing from EAS production environment.
2. **Magic link → localhost** — Supabase Auth `Redirect URLs` allowlist missing the app scheme.
3. **404 on auth callback / invite tap** — no expo-router screen at `/auth/callback` or `/invite/[token]`.

Bugs 1 and 2 require infra (EAS env, Supabase dashboard); bug 3 is now also covered
statically by `src/__tests__/deep-links-contract.test.ts` and `internal-routes-audit.test.ts`.
The flows here add the runtime/device half: the app actually boots and the screens
actually render.

## Setup (one-time, local only)

```bash
brew install --formula mobile-dev/tap/maestro
```

You also need an iOS simulator (or real device) with the dev-client build of the app
installed. The simulator language should be **French** — the assertions match FR
locale strings. (To make assertions locale-agnostic, add `testID` props to PixelInput
and PixelButton — see TODO at the bottom.)

## Run

Boot the app first (separate terminal):

```bash
npm run dev      # then press `i` to open iOS sim, or
npm run ios      # builds + boots
```

Once the app is on the sim/device:

```bash
npm run e2e                                   # run all flows
maestro test .maestro/sign-in.yaml            # single flow
maestro test .maestro/deep-link-callback.yaml
maestro test .maestro/deep-link-invite.yaml
```

For debugging:

```bash
maestro studio                                # interactive flow recorder
maestro test --debug-output ./maestro-debug   # full logs + screenshots on failure
```

## Flows

| File                      | What it asserts                                                            |
| ------------------------- | -------------------------------------------------------------------------- |
| `sign-in.yaml`            | App boots → sign-in screen renders → email submission lands on check-email |
| `deep-link-callback.yaml` | `thisisthejourney://auth/callback#…` doesn't surface the +not-found 404    |
| `deep-link-invite.yaml`   | `thisisthejourney://invite/<token>` doesn't surface the +not-found 404     |

## CI

Not wired yet. Maestro Cloud (paid) or self-hosted runners with iOS simulators are
the two options. See https://maestro.mobile.dev/cloud.

## TODO

- Add `testID` to PixelInput/PixelButton so flows survive i18n changes.
- Add a flow that exercises a real signed-in user creating a trip (requires a
  test account in Supabase + magic-link bypass via deep-link with a real session token).
