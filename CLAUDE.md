# Claude Code Context — This Is The Journey

> Keep this file ≤ 300 lines. Loaded at every session start to give Claude full project context.

## Project

**This Is The Journey** — collaborative trip planner mobile app (iOS + Android) with a pixel-art gaming aesthetic. Codename: `journey`. Target launch ~3 months from start.

**Pitch**: Plan together. Travel together. Adventure together. Friends share trips with milestones rendered as a Duolingo-style path on a Mario World overworld map. Avatars gravitate live (Supabase Realtime). Hinge-for-trips public discovery in v1.1.

## Single source of truth

- **Spec**: `docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md` (full product + technical design, ~1600 lines)
- **Phase 0 Plan**: `docs/superpowers/plans/2026-05-24-this-is-the-journey-phase-0-bootstrap.md`
- **Credits**: `CREDITS.md` (OSS attributions, audited in CI)

## Stack

- **Mobile**: Expo SDK 54 (managed) + EAS Dev Client (NOT Expo Go — need MapLibre native)
- **Lang**: TypeScript strict mode
- **Routing**: Expo Router v4 file-based (`src/app/`)
- **UI**: NativeWind v4 + Cozy Arcade design tokens
- **State**: Zustand + TanStack Query v5 (persistence enabled)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **Map**: @maplibre/maplibre-react-native + Skia overworld
- **Animations**: Reanimated v3 + Skia
- **i18n**: i18n-js + expo-localization, FR + EN day 1, key-driven, ZERO hardcoded strings
- **Crash**: Sentry — **Analytics**: PostHog
- **Auth v1.0**: email magic link + Apple Sign-In + Google Sign-In

## Supabase project

- Project ID: `ewsoupkfkachxidmuwoi`
- URL: `https://ewsoupkfkachxidmuwoi.supabase.co`
- Publishable key in `.env` (gitignored)
- Access via `plugin:supabase:supabase` MCP (OAuth, authenticated)
- MCP tools: apply_migration, execute_sql, deploy_edge_function, list_tables, generate_typescript_types, get_advisors, get_logs, etc.

## Design principles (12 commandments)

1. **Private by default** everywhere
2. **Schema = structure, content = user-driven** — no preloaded content
3. **Suggestions, never impositions** — templates browsable, never auto-applied
4. **Open to ≠ Filter out** — positive framing
5. **Women-only enabled, men-only no** — safety-first
6. **Identity self-declared, multi-select, inclusive**
7. **No misrepresentation tooling** (cooldown gender change)
8. **Safety mechanisms native** (report/block/panic)
9. **No tier-zero DM** (request msg + handle exchange post-accept)
10. **No vibe dating** — "travel companions" copy
11. **Smart reminders = suggestions, never auto-content**
12. **i18n key-driven, zero hardcoded strings**

## Cozy Arcade palette

```
primary-500 #E63946 | primary-600 #C62A38 (text-on-btn) | primary-700 #A41E2A
secondary-500 #2A9D8F | secondary-700 #1F756B
accent-500 #FFCB05 (coin) | accent-700 #A87E00
sky-500 #6BBFE2 | sky-700 #2E6E91
success #2D9D5F | warning #E68A1C | error #D6362B | info #3F76D6
cream #FFF8EC (bg) | surface #FFFFFF | surface-alt #FCEFD5
text-primary #0F1A2E | text-secondary #5E6779 | border #0F1A2E
```

Fonts: `pixel` (Press Start 2P, accent only), `heading` (Fredoka), `body` (Nunito).

## Folder structure (SOLID feature-based)

```
/src
  /app                   # Expo Router screens (file-based)
  /core                  # app-level infra
    /env                 # zod-validated process.env
    /i18n                # i18n-js + locales (en.json, fr.json)
    /supabase            # client + generated types
    /sentry, /posthog    # SDK init (safe no-op if no keys)
    /theme               # design tokens (source of truth)
  /shared
    /components          # design system (Pixel*)
    /utils               # cn helper, generic
  /features              # feature modules (Phase 1+)
    /auth, /trips, /milestones, /map, /realtime, /smart-reminders,
    /achievements, /documents, /checklists, /photos, /discovery (v1.1),
    /passport-verification
  /assets                # sprites, sounds, fonts, images, world themes
```

Path aliases: `@/*`, `@app/*`, `@core/*`, `@shared/*`, `@features/*`, `@assets/*`.

## Code conventions (non-negotiable)

- TypeScript strict, `noImplicitAny`, `strictNullChecks`
- Path aliases ONLY (`@core/...`), NO `../../`
- `kebab-case.ts` non-components, `PascalCase.tsx` components
- Tests in `__tests__/` next to code, Jest + RNTL
- ESLint flat (eslint.config.js), Prettier 100ch single quotes
- Husky pre-commit: lint-staged
- NO magic numbers — named constants
- NO `any` (use `unknown` or proper types)
- Async: always handle loading + error
- DO NOT skip `npm run typecheck` before claiming done

## Commands

```bash
npm run dev              # Metro bundler + EAS dev client
npm run ios / android    # native run (after prebuild)
npm run lint             # ESLint
npm run format           # Prettier write
npm run typecheck        # tsc --noEmit
npm test                 # Jest
npm run credits:check    # CREDITS.md audit (CI)
npm run references:clone # OSS reference repos
```

## Git workflow

- Branch `main` (no PR review, solo dev)
- Conventional commits: `feat:`, `chore:`, `docs:`, `fix:`, `refactor:`, `test:`, `ci:`
- GitHub Actions CI: lint + format + typecheck + tests + credits
- Repo: `https://github.com/<user>/Journey` (public)
- NEVER commit `.env` (gitignored)
- NEVER commit `ios/`, `android/` (gitignored, regen via `expo prebuild`)
- `.references/` gitignored (OSS clones)

## Sandbox workarounds

- `git init/commit/push` need `dangerouslyDisableSandbox: true` (sandbox blocks `.git/` writes)
- `npm install` may need `--cache $TMPDIR/npm-cache` (cache perm issues)
- `mkdir .claude/...` needs sandbox bypass
- `cat > .github/workflows/*.yml` via Bash heredoc (Write tool has GH Actions security hook)

## Active phase

**Phase 0 — Bootstrap** ✅ DONE (14/15, T15 EAS build deferred).
**Phase 1 — Auth + Trips Foundation** ✅ DONE (18/20, T15/T20 cleanup pending).
**Phase 2 — Milestones + Path UI** ✅ DONE (14/15, T15 = this commit batch).

Phase 0 done: T1 git+config · T2 LICENSE/README · T3 Expo+TS · T4 EAS+env · T5 NativeWind+tokens · T6 ESLint+Prettier+Husky · T7 OSS refs+credits CI · T8 design tokens+fonts · T9 i18n + tests · T10 Supabase client (project ewsoupkfkachxidmuwoi) · T11 GH Actions CI · T12 Sentry+PostHog · T13 root layout + PixelText · T14 Welcome screen.

Phase 1 done: T1-T3 DB migrations (profiles + trips + members + invitations + RLS) + TS types generated · T4 12 avatar sprites + manifest · T5-T8 PixelButton/Card/Input/Chip DS components · T9 auth (magic link + AuthGuard + screens) · T10-T11 profile (onboarding + sprite picker + 50-country picker) · T12 QueryClientProvider + deep link handler · T13 5-tab shell · T14-T16 trips CRUD (api + hooks + TripCard + CreateTripScreen + TripDetailScreen) · T17 trip members + invitations + accept-invitation edge function (deployed v1 ACTIVE) · T18 Home with upcoming trip card · T19 first-login routing in AuthGuard.

Phase 2 done: T1-T2 DB migrations (milestones + checkins + PostGIS + RLS) + TS types regen · T3 30 milestone sprites + manifest · T4 PixelBottomSheet (gorhom) · T5 PixelDialog · T6 milestones API + hooks (CRUD + checkins) · T7 MapTiler geocoding service · T8 MilestoneNode (Duolingo circle + sprite + 4 states) · T9 MilestoneEdge (SVG Bézier) · T10 PathView + pathLayout (sanidhyy indentation cycle + 6 tests) · T11 MilestoneCreationSheet (type chips + debounced geocoding + boss toggle + sprite picker) · T12 SpritePicker (modal grid filterable by category) · T13 Wire PathView into TripDetailScreen with FAB + empty state · T14 CheckinAnim Reanimated coin burst + optimistic update. 69 tests passing.

Deferred: T15 EAS dev client build (needs interactive setup) · Apple/Google Sign-In (Phase 1.5) · Stripe Identity (Phase 1.5) · Map tab MapLibre overworld (Phase 3) · sounds (Phase 6).

## Code-validator agent — MANDATORY

**HARD RULE**: After EVERY code change (any file touched in `/src`, `/app`, jest config, eslint config, tsconfig, package.json), invoke the `code-validator` agent. No exceptions.

```
Task tool (general-purpose):
  description: "Validate recent code changes"
  prompt: "Run the code-validator agent flow defined in .claude/agents/code-validator.md on the most recently modified files. Report PASS/FAIL with specific errors and fixes."
```

The agent runs typecheck + lint + tests + static checks on the changed code. Catches bugs before they ship.

When NOT to invoke: pure docs changes (`*.md`), tests-only changes (run tests directly), config files unrelated to code (e.g. .editorconfig).

## Useful MCPs

- `plugin:supabase:supabase` — Journey DB ops (authenticated)
- `mcp__a76e992d-...` — Supabase org-wide (Alice CRM Org, NOT used for Journey)
- `plugin:sentry:sentry` — create_project, search_issues
- Vercel MCP, Linear MCP, Figma MCP, GitHub via `gh` CLI

## Anti-patterns (don't do)

- ❌ Hardcoded strings in JSX — always `t('key.path')`
- ❌ Hex colors in NativeWind classes — use tokens
- ❌ Magic numbers — extract to constants
- ❌ Relative imports across features — path aliases
- ❌ Files >300 lines — split by responsibility
- ❌ Skip typecheck/lint before commit
- ❌ Expo Go (need EAS dev client for MapLibre)
- ❌ Subagents for trivial mechanical tasks — do directly, batch commits
- ❌ Pre-fill user content (checklists, milestones, docs) — empty by default
- ❌ Add features not in spec without updating spec first

## When stuck

1. Re-read relevant spec section (4.3 SOLID, 5 data model, 6 UI/UX, 8.5 passport verification, 9 smart reminders, 12.1 phases)
2. Check `.references/` for OSS inspiration patterns
3. Run `code-validator` agent on changed files
4. Ask user before big architectural decisions
