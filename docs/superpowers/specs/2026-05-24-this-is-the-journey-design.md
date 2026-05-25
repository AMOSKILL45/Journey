# This Is The Journey — Design Spec

**Date** : 2026-05-24
**Status** : Draft — pending user review
**Owner** : @koskasamos
**Codename** : `journey`
**Marketing name** : `This Is The Journey`

---

## 1. Vision & Positioning

### 1.1 Pitch (1 sentence)

**This Is The Journey** est un trip planner collaboratif mobile à esthétique gaming pixel-art. Chaque voyage devient une aventure Mario : milestones rendus en path Duolingo, overworld map style Mario World, avatars des copains qui gravitent en temps réel, documents consolidés, achievements gamifiés. Privé entre amis OU public avec discovery de co-voyageurs (Hinge-for-trips, safety-first).

### 1.2 Tagline marketing

> _"Plan together. Travel together. Adventure together."_

### 1.3 Audience cible

- **Core** : groupes d'amis (3-10 pers) qui voyagent ensemble pour 1-3 semaines
- **Expansion v1.1** : solo travelers cherchant des companions sur la route (backpackers, digital nomads, gap year, festival goers)
- **Pas pour** : business travel, séminaires d'entreprise, organisateurs pro

### 1.4 Différenciation

| Concurrent                   | Manque                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| Wanderlog / Tripit           | Plat, utilitaire, aucune dimension émotionnelle                   |
| Polarsteps / Findpenguins    | Journaling-only, pas de planification ni collaboration multi-user |
| Couchsurfing / Tripr / GAFFL | Sketchy ou abandonnés, pas de planification                       |
| AdventureLog (OSS)           | GPL, Svelte/Django, pas mobile-native                             |

Personne ne combine **planification collaborative + souvenir gamifié + discovery sociale safe** avec une identité visuelle distinctive.

---

## 2. Scope

### 2.1 MVP v1.0 (launch stores)

#### Core features (must-have)

1. Auth (email magic link + **Sign-In with Apple** + **Sign-In with Google**, day 1)
2. Profile (avatar sprite picker, **passport upload + on-device MRZ OCR** pour extraire pays/expiry/nom, ou self-declared, opt-in)
3. Trip CRUD (créer, éditer, supprimer, archiver)
4. Trip members + invitations magic link
5. Milestones CRUD (city/hotel/activity/transport/food/landmark/custom, fully user-defined types + sprites)
6. Vue Path Duolingo (Bézier curve + nodes, états locked/available/current/completed)
7. Vue Overworld Map (hand-crafted tilesets, 2 world themes v1: Generic + USA Desert)
8. Vue Real Map Stylized (MapLibre + custom 8-bit style flat)
9. Crossfade entre les deux modes selon zoom (Reanimated)
10. Documents upload (PDF/image, catégorie free-text, attachable au trip ou milestone)
11. Checklist trip (items entièrement user-defined, assignation, due dates, drag-reorder)
12. Smart reminders system (knowledge base ~150 rules, rules engine Edge Function, opt-out granulaire)
13. Avatars temps réel sur map (Supabase Realtime presence + broadcast, density management, panic toggle)
14. Push notifications (Expo Push, opt-in granulaire)
15. Achievements / badges (~20 base, Mario world clear animation)
16. Adventurer Passport multi-trip (stamps, countries visited)
17. Settings (sound, haptics, language FR/EN, notifications, privacy, account deletion)

#### Cherry-on-top features (in v1.0 if time)

18. Pre-trip checklist gamifiée (quick-add chips, dismissable suggestions)
19. Distance + temps auto entre milestones (OSRM)
20. Météo par milestone (Open-Meteo)
21. Export calendrier .ics
22. Polls (création, vote 1-tap, résultats live)
23. Reactions pixel emoji
24. Photos upload + galerie
25. Trip Scrapbook auto-généré à la fin du trip
26. Sound design 8-bit toggleable + music chiptune par theme

#### Bold gambits (in v1.0 if time, else v1.1)

27. World themes additionnels (Europe Forest, Asia Sakura, Tropical Beach)
28. Boss milestones (sprite spécial + cutscene unlock)
29. Time capsules
30. Random encounters (POI suggestions surprise via Places API)
31. Caravan mode (sync screen 2 users)

#### Sociale foundation v1.0 (schema en place, UI minimale)

32. Trip visibility field (private/unlisted/public_view)
33. "Open trip link" = page publique view-only
34. Profile public minimal opt-in (bio, sprite, pays visités, badges)
35. Schema complet pour join_requests/reports/blocks/discovery (tables vides)

### 2.2 Hors scope MVP v1.0 (à NE PAS faire)

- ❌ Réservation in-app (vols, hôtels)
- ❌ Paiement intégré
- ❌ Chat/messagerie in-app (les potes ont WhatsApp)
- ❌ Editor d'itinéraire AI (v2)
- ❌ Reviews/notations de lieux
- ❌ Marketplace
- ❌ Watch app, widgets
- ❌ Pixel shader sur real map (risk perf, v1.x si besoin)

### 2.3 Phase v1.1 (post-launch, ~4-6 sem)

- Discovery feed (map + list) avec filters
- 7-step publish-to-discovery flow avec co-traveler preferences (gender multi-select, age range, vibes, languages, budget, joinable segments)
- Join request flow + contact bridge (exchange handles post-accept)
- Verification light (email obligatoire pour public, phone optional pour Verified badge)
- Reports/blocks UI + T&S response workflow live
- Smart matching basics

### 2.4 Phase v1.2

- Reviews entre travel buddies
- Verified profiles full (Stripe Identity ou Onfido)
- Filters avancés discovery
- In-app messaging minimal sandboxé

### 2.5 Phase v1.3+

- Templates de trip community-contributed
- Follow other travelers
- Web companion (Next.js)
- AI fill-the-gaps planner
- Splitwise dépenses
- Apple Wallet / Google Wallet
- Mode "live story" Snap Map-style

---

## 3. Principes directeurs (gravés dans le design)

1. **Private by default** partout (trip, profile, location)
2. **Schema = structure, content = user-driven** (rien de préchargé, tout customisable)
3. **Suggestions, jamais impositions** (templates browsables, jamais auto-appliqués)
4. **Open to ≠ Filter out** (framing positif sur les préférences)
5. **Women-only enabled, men-only no** (safety-first, anti-discrimination)
6. **Identity = self-declared, multi-select, inclusif** (women/men/non-binary)
7. **No misrepresentation tooling** (verification + cooldown gender change)
8. **Safety mechanisms natifs et omniprésents** (report/block/panic/emergency contacts)
9. **No tier-zero DM** (1 request message + exchange handle post-accept)
10. **Pas de vibe dating** (copy strict "travel companions", pas de swipe)
11. **Smart reminders = suggestions contextuelles, jamais auto-content**
12. **Knowledge base curée par nous, opt-out granulaire**
13. **i18n KEY-DRIVEN partout, zéro string hardcodée** (extensible à toute langue, communauté contributable)
14. **SOLID + modular code structure** (feature-based modules, dependency inversion, testable, ESLint strict)
15. **100% gratuit pour les users à vie** sur scope core (no ads, no paywall, no data selling)

---

## 4. Architecture technique

### 4.1 Stack

```
MOBILE
├── Expo SDK 54+
├── EAS Build + EAS Dev Client (PAS Expo Go, requis pour MapLibre natif)
├── EAS Updates (OTA)
├── TypeScript strict
├── Expo Router v4 (file-based)
├── NativeWind v4 (Tailwind RN)
├── Zustand (state global léger)
├── TanStack Query (data fetching + cache + persistence)
├── react-hook-form + zod (validation)
├── @shopify/react-native-skia (path/avatars/shaders)
├── react-native-reanimated v3 (transitions, crossfade)
├── react-native-svg (path Bézier, sprites SVG)
├── @maplibre/maplibre-react-native (map native + style custom)
├── expo-location, expo-image-picker, expo-document-picker
├── expo-file-system, expo-image-manipulator
├── expo-font (Press Start 2P, Fredoka, Nunito)
├── expo-haptics, expo-av (audio)
├── expo-notifications (push via Expo Push Service)
├── i18n-js + expo-localization (FR + EN day 1, extensible à toute langue)
├── react-native-passport-reader OU vision-camera + custom MRZ parser (passport scan free)
└── @sentry/react-native

BACKEND (Supabase)
├── Postgres 15+ avec PostGIS
├── Row-Level Security (RLS) sur toutes les tables
├── Supabase Auth (email magic link + OAuth)
├── Supabase Storage (avatars, photos, PDFs)
├── Supabase Realtime (Broadcast + Presence + Postgres Changes)
├── Edge Functions Deno (geocoding proxy, scrapbook PDF gen, smart reminders rules engine, invitations)
└── Database webhooks (trigger push notifs)

APIs EXTERNES
├── MapTiler (vector tiles, free 100k req/mois)
├── Open-Meteo (météo, no auth, illimité free)
├── Routing distance/temps :
│     - dev/beta : OSRM public demo (fair-use only, NOT production)
│     - v1.0 launch : self-host OSRM (Fly.io free tier or $5/mo VPS) OR Mapbox Directions ($200/mo free credit suffit)
│     - Décision finale Phase 7 selon load test
├── Google Places API (random encounters v1.x, $200 free credit)
└── Expo Push Service (notifs)

EAS Build limits à anticiper :
├── Free tier : 30 builds/mois (15 iOS + 15 Android typique)
├── Production usage attendu : 1-2 builds/sem pendant dev = OK free tier
├── Beta phase : 3-5 builds/sem possibles = peut nécessiter Production plan ($29/mo)
└── Stratégie : EAS Updates (OTA) maximum pour minimiser native builds

INFRA / DEVOPS
├── GitHub (repo, Actions CI)
├── EAS Build (cloud iOS+Android)
├── EAS Submit (auto store submission)
├── PostHog Cloud (analytics, free 1M events/mois)
└── Sentry (crash reporting, free 5k errors/mois)
```

### 4.2 Architecture en couches (app)

```
┌─ UI Layer (screens + composants design system)
├─ State Layer (Zustand stores)
├─ Data Layer (TanStack Query hooks)
├─ Service Layer (Supabase clients + APIs externes)
└─ Storage Layer (offline cache: expo-file-system + AsyncStorage)
```

### 4.3 Structure de code SOLID + modular (feature-based)

```
/src
  /app                          # Expo Router file-based screens
    /(auth)                     # auth flow group
    /(tabs)                     # 5 bottom tabs
    /(modals)                   # full-screen modals (create-trip, etc.)
  /features                     # feature modules (autonomous, testable)
    /auth
      /api                      # api/auth.ts — supabase calls only
      /hooks                    # hooks/useAuth.ts, useSignIn.ts
      /components               # AuthForm, GoogleSignInButton, etc.
      /screens                  # SignInScreen, MagicLinkScreen
      /types                    # auth types
      /utils                    # helpers (validation, etc.)
      /__tests__                # unit + integration tests
      index.ts                  # public API of the feature
    /trips
      ... same structure
    /milestones
      ... same structure
    /map
      ... same structure
    /realtime
      ... same structure
    /smart-reminders
      ... same structure
    /achievements
      ... same structure
    /documents
      ... same structure
    /checklists
      ... same structure
    /photos
      ... same structure
    /discovery                  # v1.1
      ... same structure
    /passport-verification
      /api                      # mrz-parser, stripe-identity (v1.2)
      /hooks
      /components
      ...
  /shared                       # cross-feature reusable
    /components                 # design system (Pixel*)
      /PixelButton
        /index.ts
        /PixelButton.tsx
        /PixelButton.styles.ts
        /PixelButton.test.tsx
        /PixelButton.stories.tsx
      /PixelCard
      /PixelDialog
      ... (all 11 components from Section 6.5)
    /hooks                      # cross-cutting hooks
    /services                   # cross-cutting services
    /utils                      # generic utils
    /types                      # shared TS types
    /constants                  # app constants
  /core                         # app-level infra
    /router                     # navigation config
    /theme                      # design tokens + NativeWind config
    /i18n                       # translation setup + locale files
      /locales
        /en.json
        /fr.json
        /es.json                # v1.1+
        ...
      /index.ts                 # i18n instance + hooks
    /supabase                   # client init + types generated
    /sentry                     # crash reporting init
    /posthog                    # analytics init
  /assets                       # sprites, sounds, fonts, images
    /sprites
      /kenney
      /custom
      /index.ts                 # sprite manifest (auto-generated)
    /sounds
    /music
    /fonts
    /worldThemes                # overworld tilesets
      /generic
      /usa-desert
      /europe-forest
      ...
```

### 4.4 SOLID principles enforcement

| Principle                     | Application                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S — Single Responsibility** | Chaque fichier/composant fait UNE chose. Hooks séparés par responsabilité (useTrip vs useTripMembers vs useTripPath). Services divisés par domaine.                                                 |
| **O — Open/Closed**           | Composants design system extensibles via props/variants (PixelButton with variant prop), pas via modification du core. Sprite library extensible via manifest. World themes extensibles via config. |
| **L — Liskov Substitution**   | Tous les Pixel\* components implémentent leur interface contract. AnyPixelButton peut remplacer PixelButton sans break le parent.                                                                   |
| **I — Interface Segregation** | Pas de "god types". Profile a `PublicProfile`, `PrivateProfile`, `EditableProfile` séparés. Hooks small et focused.                                                                                 |
| **D — Dependency Inversion**  | Services dépendent d'abstractions (interface `AuthService`), implémentations concrètes injectées (`SupabaseAuthService`). Permet de mocker en test, ou swap provider plus tard.                     |

### 4.5 Coding conventions

- **TypeScript strict mode** (`strict: true`, `noImplicitAny`, `strictNullChecks`)
- **ESLint** : eslint-config-expo + react-hooks + typescript-eslint strict
- **Prettier** : config standard, 100 char line, single quotes
- **Naming** : `camelCase` vars/fns, `PascalCase` components/types, `SCREAMING_SNAKE` constants
- **File naming** : `kebab-case.ts` for non-components, `PascalCase.tsx` for components
- **Imports** : absolute via path aliases (`@/features/auth`, `@/shared/components`), no relative `../../../`
- **Comments** : minimal, only WHY non-obvious. JSDoc pour public APIs.
- **Tests** : Vitest or Jest. Unit tests sur business logic + utils. Integration tests sur hooks + services. RNTL pour composants critiques.
- **Pre-commit hook** : lint + typecheck + tests changed files (Husky + lint-staged)
- **CI** : same checks on every PR via GitHub Actions
- **No magic numbers** : extract to named constants
- **Error handling** : Result type ou typed errors, jamais throw silencieux
- **Async** : always handle loading + error states

---

## 5. Modèle de données complet

### 5.1 Tables principales

```sql
-- ============================================================
-- USERS
-- ============================================================

profiles
  id uuid PK = auth.users.id
  username text unique
  display_name text
  bio text
  avatar_sprite_id text                -- ref vers sprite_library
  avatar_color text                    -- hex
  passport_country text                -- ISO 3166-1 alpha-2, opt-in
  passport_expires_at date
  gender text                          -- 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say'
  gender_visible_in_public boolean default false
  age_range text                       -- '18-25' | '26-35' | etc., opt-in
  show_age_in_public boolean default false
  countries_visited text[]             -- cached
  travel_style text[]                  -- ['foodie', 'backpacker', 'photo', ...]
  languages text[]                     -- ISO codes
  socials jsonb                        -- {whatsapp, instagram, email_public} — révélé après accept
  visibility text default 'private'    -- 'private' | 'friends_only' | 'discoverable'
  is_verified boolean default false
  verification_level int default 0     -- 0/1/2/3
  reputation_score int default 0
  passport_stamps jsonb                -- ['Vegas-USA', 'Tokyo-JP', ...]
  badges jsonb                         -- array of achievement IDs unlocked
  smart_reminders_enabled boolean default true
  reminder_categories_muted text[]
  preferences jsonb                    -- sound, music, haptics, language, theme
  created_at, updated_at

user_push_tokens
  id uuid PK
  user_id uuid FK
  token text
  platform text                        -- 'ios' | 'android'
  created_at, updated_at

-- ============================================================
-- TRIPS
-- ============================================================

trips
  id uuid PK
  owner_id uuid FK -> profiles
  name text
  description text
  start_date date
  end_date date
  destination_country text             -- principal, ISO
  destination_countries text[]         -- all visited
  world_theme text                     -- 'auto' | 'desert' | 'forest' | 'sakura' | 'tropical' | 'polar' | 'adventure'
  cover_image_url text
  status text                          -- 'planning' | 'in_progress' | 'completed' | 'archived'
  share_token text unique              -- pour invitations
  visibility text default 'private'    -- 'private' | 'unlisted' | 'public_view' | 'open_to_join'
  -- Si visibility = 'open_to_join':
  max_joiners int default 1
  current_joiners_count int default 0
  open_to_genders text[]               -- default ['woman','man','non_binary']
  open_age_min int                     -- ≥ 18
  open_age_max int
  open_vibes text[]
  open_budget_level text               -- 'shoestring' | 'budget' | 'mid' | 'comfort' | 'luxury'
  open_languages text[]
  joiner_note text                     -- 280 chars
  joinable_segments jsonb              -- [{start_date, end_date, milestone_ids}]
  requires_verified_joiners boolean default false
  is_women_only boolean GENERATED ALWAYS AS (open_to_genders = ARRAY['woman']) STORED
  created_at, updated_at

trip_members
  trip_id uuid FK
  user_id uuid FK
  role text                            -- 'owner' | 'editor' | 'viewer'
  location_sharing text default 'precise'  -- 'precise' | 'city_only' | 'paused' | 'never'
  joined_at timestamptz
  PK (trip_id, user_id)

trip_invitations
  id uuid PK
  trip_id uuid FK
  email text
  invited_by uuid FK
  role text default 'editor'
  token text unique
  expires_at timestamptz
  accepted_at timestamptz
  accepted_by uuid FK

-- ============================================================
-- MILESTONES
-- ============================================================

milestones
  id uuid PK
  trip_id uuid FK
  order_index decimal                  -- fractional pour reorder concurrent-friendly
  type text                            -- 'city' | 'hotel' | 'activity' | 'transport' | 'food' | 'landmark' | 'custom'
  custom_type_label text               -- si type='custom'
  name text
  description text
  location geography(Point, 4326)
  address text
  arrival_at timestamptz
  departure_at timestamptz
  is_boss boolean default false
  sprite_id text                       -- ref sprite_library
  color text                           -- override color
  metadata jsonb                       -- weather snapshot, distance from prev, etc.
  created_by uuid FK
  created_at, updated_at

CREATE INDEX milestones_trip_order ON milestones(trip_id, order_index);
CREATE INDEX milestones_location ON milestones USING GIST (location);

-- ============================================================
-- CHECKINS / PHOTOS / REACTIONS
-- ============================================================

checkins
  id uuid PK
  milestone_id uuid FK
  user_id uuid FK
  checked_in_at timestamptz
  location_actual geography(Point, 4326)
  note text

photos
  id uuid PK
  trip_id uuid FK
  milestone_id uuid FK NULL
  user_id uuid FK
  storage_path text
  caption text
  taken_at timestamptz
  location geography(Point, 4326)

reactions
  id uuid PK
  target_type text                     -- 'photo' | 'milestone' | 'checkin'
  target_id uuid
  user_id uuid FK
  emoji text
  created_at

-- ============================================================
-- DOCUMENTS
-- ============================================================

documents
  id uuid PK
  trip_id uuid FK
  milestone_id uuid FK NULL
  category text                        -- FREE TEXT user-defined
  name text
  storage_path text
  file_type text                       -- 'pdf' | 'image' | 'url'
  size_bytes int
  uploaded_by uuid FK
  uploaded_at timestamptz

-- ============================================================
-- CHECKLISTS
-- ============================================================

trip_checklists
  id uuid PK
  trip_id uuid FK
  title text
  is_default boolean
  created_by uuid FK
  created_at

checklist_items
  id uuid PK
  checklist_id uuid FK
  label text                           -- FREE TEXT
  description text
  category text                        -- user-tag
  assigned_to uuid FK NULL             -- NULL = shared
  due_date date
  is_done boolean default false
  done_at timestamptz
  done_by uuid FK
  order_index int
  created_by uuid FK
  created_at

-- ============================================================
-- POLLS
-- ============================================================

polls
  id uuid PK
  trip_id uuid FK
  milestone_id uuid FK NULL
  question text
  options jsonb                        -- [{"id":"a","label":"Pizza"}]
  created_by uuid FK
  expires_at timestamptz
  created_at

poll_votes
  poll_id uuid FK
  user_id uuid FK
  option_id text
  voted_at timestamptz
  PK (poll_id, user_id)

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================

achievement_definitions
  id text PK                           -- 'first_trip', 'five_hotels'...
  name text
  description text
  sprite_id text
  rarity text                          -- 'common' | 'rare' | 'epic' | 'legendary'
  trigger_rule jsonb                   -- DSL d'évaluation

user_achievements
  user_id uuid FK
  achievement_id text FK
  unlocked_at timestamptz
  trip_id uuid FK NULL
  PK (user_id, achievement_id)

-- ============================================================
-- TIME CAPSULES
-- ============================================================

time_capsules
  id uuid PK
  trip_id uuid FK
  milestone_id uuid FK NULL
  author_id uuid FK
  recipient_id uuid FK NULL            -- NULL = group
  message text
  open_after timestamptz
  open_at_milestone uuid FK NULL
  opened_at timestamptz
  created_at

-- ============================================================
-- SMART REMINDERS (knowledge base curée par nous)
-- ============================================================

country_requirements
  id text PK                           -- 'us_esta', 'uk_eta'...
  destination_country text
  destination_regions text[]
  requirement_type text                -- 'visa' | 'eta' | 'vaccine' | 'cash_declaration' | etc.
  applies_to_passport_countries text[]
  excluded_passport_countries text[]
  trip_duration_max_days int
  trip_duration_min_days int
  trip_purpose text[]
  passport_validity_required_months int
  required boolean
  severity text                        -- 'mandatory' | 'strongly_recommended' | 'recommended' | 'good_to_know'
  title text
  body text
  action_label text
  action_url text
  estimated_processing_days int
  estimated_cost_usd numeric
  followup_lead_times int[]            -- [60, 30, 7]
  i18n_key text
  last_verified date
  source_urls text[]
  created_at, updated_at

trip_smart_reminders
  id uuid PK
  trip_id uuid FK
  user_id uuid FK
  requirement_id text FK
  status text default 'pending'        -- 'pending' | 'done' | 'dismissed' | 'snoozed' | 'not_applicable'
  snooze_until timestamptz
  marked_done_at timestamptz
  added_to_checklist_item_id uuid FK
  last_notified_at timestamptz
  notifications_sent_at timestamptz[]
  user_note text
  created_at
  UNIQUE (trip_id, user_id, requirement_id)

-- ============================================================
-- DISCOVERY & SOCIAL (v1.1, schema en v1.0)
-- ============================================================

trip_join_requests
  id uuid PK
  trip_id uuid FK
  requester_id uuid FK
  message text                         -- 280 chars
  proposed_segment_start date
  proposed_segment_end date
  proposed_milestones uuid[]
  status text default 'pending'        -- 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
  responded_at timestamptz
  responded_by uuid FK
  response_message text
  contact_exchanged_at timestamptz
  joiner_gender_at_request text
  joiner_age_at_request int
  joiner_languages text[]
  joiner_verification_level int
  match_score int                      -- 0-100, calculé
  expires_at timestamptz               -- auto 7j
  created_at

trip_member_reviews
  id uuid PK
  trip_id uuid FK
  reviewer_id uuid FK
  reviewed_id uuid FK
  rating int                           -- 1-5
  comment text
  travel_again boolean
  is_public boolean default true
  created_at
  UNIQUE (trip_id, reviewer_id, reviewed_id)

reports
  id uuid PK
  reporter_id uuid FK
  target_type text                     -- 'user' | 'trip' | 'photo' | 'join_request' | 'time_capsule'
  target_id uuid
  reason text                          -- 'spam' | 'harassment' | 'inappropriate' | 'safety_concern' | 'other'
  details text
  status text default 'pending'        -- 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  resolved_at timestamptz
  resolved_by uuid FK
  created_at

user_blocks
  blocker_id uuid FK
  blocked_id uuid FK
  reason text
  created_at
  PK (blocker_id, blocked_id)

trip_discovery_index
  trip_id uuid PK FK
  geo_bbox geography(Polygon, 4326)
  date_range tstzrange
  countries text[]
  cities text[]
  searchable_text tsvector
  member_count int
  remaining_slots int
  is_open_to_join boolean
  is_women_only boolean
  open_to_genders text[]
  open_age_min int
  open_age_max int
  open_vibes text[]
  open_languages text[]
  refreshed_at timestamptz

CREATE INDEX idx_discovery_geo ON trip_discovery_index USING GIST (geo_bbox);
CREATE INDEX idx_discovery_dates ON trip_discovery_index USING GIST (date_range);
CREATE INDEX idx_discovery_text ON trip_discovery_index USING GIN (searchable_text);

-- ============================================================
-- SUPPORT TABLES
-- ============================================================

sprite_library                         -- catalogue référencé (synced from disk)
  id text PK                           -- 'kenney/medieval/castle_red'
  name text
  category text                        -- 'building' | 'character' | 'nature' | etc.
  tags text[]
  asset_url text
  pixel_size text                      -- '16x16' | '32x32' | '64x64'
  source text                          -- 'kenney' | 'limezu' | 'pixelfrog' | 'custom'
  license text                         -- 'CC0' | 'CC-BY-4.0' | 'MIT'

checklist_templates                    -- inspiration optionnelle (v1.0 system, v1.1 community)
  id uuid PK
  name text
  region_tag text
  created_by uuid FK NULL              -- NULL = system
  is_public boolean
  description text
  items jsonb
  created_at

weather_cache                          -- per milestone
  milestone_id uuid PK FK
  forecast jsonb
  fetched_at timestamptz
```

### 5.2 RLS policies (esquisse)

- `profiles` : SELECT public sur (`id, display_name, avatar_sprite_id, avatar_color, bio`). SELECT private fields seulement self. UPDATE self only.
- `trips` : SELECT si owner ou trip_member ou (visibility IN ('unlisted','public_view','open_to_join') AND viewing share_token / discovery). UPDATE/DELETE si owner ou editor.
- `trip_members` : SELECT si in same trip. INSERT seulement via accept_invitation function. DELETE self ou owner.
- `milestones`, `documents`, `photos`, `checklists`, `polls`, `time_capsules` : cascade via trip_id (SELECT/INSERT/UPDATE/DELETE selon role).
- `time_capsules` : SELECT seulement si (now() >= open_after AND (recipient_id IS NULL OR recipient_id = auth.uid())).
- `trip_join_requests` : INSERT par requester. SELECT par requester ou owner du trip ciblé. UPDATE par owner du trip ciblé.
- `reports` : INSERT auth. SELECT par admin (custom claim) ou self (own reports).
- `user_blocks` : INSERT self. SELECT self.
- `country_requirements` : SELECT public. INSERT/UPDATE admin only.

### 5.3 Database triggers + Edge Functions

- **Trigger achievement evaluation** (after insert checkins/photos/etc.) : recompute eligible achievements
- **Trigger discovery index refresh** (after update trips) : repopulate trip_discovery_index
- **Trigger push notification** (after insert checkins/photos/poll/etc.) : call Edge Function "send_push"
- **Edge Function smart_reminders_cron** (Supabase Cron 2×/jour) : evaluate rules for upcoming trips, insert into trip_smart_reminders, schedule push
- **Edge Function generate_scrapbook** (on demand) : compose SVG/PDF récap trip → upload Storage → return URL
- **Edge Function geocoding_proxy** : proxify MapTiler Geocoding with our key
- **Edge Function send_invitation** : génère magic link + email
- **Edge Function compute_match_score** (v1.1) : on insert join_request, calcule match_score

---

## 6. UI/UX Direction

### 6.1 Style philosophy : "Cozy Arcade"

Blend de :

- **Mario World / Mario Kart** : palette saturée joyeuse, sprites overworld, hard pixel shadows
- **Animal Crossing** : chaleur, palette douce sous-jacente, friendly NPC
- **Waze** : avatars vivants, smart alerts non-anxiogènes, bubbles UI
- **Duolingo + Habitica** : path UI, light gamification
- **Journey (le jeu)** : cinematic minimalist moments (world clear, scrapbook)

### 6.2 Palette de couleurs (verified AA)

#### Light mode

| Token            | Hex     | Usage                                         |
| ---------------- | ------- | --------------------------------------------- |
| `primary-500`    | #E63946 | Brand / accent (Mario red)                    |
| `primary-600`    | #C62A38 | Bouton primary bg (avec texte blanc 5.5:1 AA) |
| `primary-700`    | #A41E2A | Pressed state                                 |
| `secondary-500`  | #2A9D8F | Calm green, secondary                         |
| `secondary-700`  | #1F756B | Bouton secondary (texte blanc 6.0:1 AA)       |
| `accent-500`     | #FFCB05 | Coin yellow / XP / achievement highlight      |
| `accent-700`     | #A87E00 | text-on-accent                                |
| `sky-500`        | #6BBFE2 | Info / secondary action                       |
| `sky-700`        | #2E6E91 | text-on-sky                                   |
| `success`        | #2D9D5F | Confirmations (4.6:1)                         |
| `warning`        | #E68A1C | Warnings                                      |
| `error`          | #D6362B | Errors / destructive (5.3:1)                  |
| `info`           | #3F76D6 | Smart reminders (5.8:1)                       |
| `bg-cream`       | #FFF8EC | App background (warm paper)                   |
| `surface`        | #FFFFFF | Cards                                         |
| `surface-alt`    | #FCEFD5 | Surface alternatif                            |
| `text-primary`   | #0F1A2E | Texte principal (14.5:1 AAA)                  |
| `text-secondary` | #5E6779 | Texte secondaire (5.4:1 AA)                   |
| `text-disabled`  | #A8B0BD | Disabled                                      |
| `border`         | #0F1A2E | 8-bit hard borders + shadows                  |

#### Dark mode

| Token          | Hex     |
| -------------- | ------- |
| `primary-500`  | #FF6B7A |
| `bg-deep`      | #0F1421 |
| `surface-dark` | #1A2236 |
| `text-primary` | #F5F1E8 |
| `border-dark`  | #000000 |

### 6.3 World theme palettes (overworld map)

**Scope** : 5 themes pour v1.0 launch (cf Section 12.1 Phase 3 + Phase 8). Polar Ice = v1.x post-launch.

| Theme                                       | Phase v1.0 | Sky/BG           | Ground           | Accents                   |
| ------------------------------------------- | ---------- | ---------------- | ---------------- | ------------------------- |
| **🌌 Adventure Generic** (default fallback) | Phase 3    | #FFCB05, #E63946 | #7DA847, #6BBFE2 | classic Mario quartet     |
| **🌵 USA Desert**                           | Phase 3    | #FFB174          | #FCE4B6          | #3C8DBC, #D6362B, #7DA847 |
| **🌲 Europe Forest**                        | Phase 8    | #A8D6FF          | #86A86E          | #D1654A, #6E4628, #9CA8B0 |
| **🌸 Asia Sakura**                          | Phase 8    | #FFD6E0          | #9FCFA0          | #5B3B7F, #FFCB05, #B82838 |
| **🏝 Tropical Beach**                       | Phase 8    | #5FCFE6          | #FFF1B8, #3FBA9A | #FF7A4A, #FF4592          |
| **❄️ Polar Ice**                            | v1.x       | #D8EAFA          | #FFFFFF, #A8B8C8 | #3F76D6, #9D6BE2          |

Si user choisit destination sans theme matching → fallback `Adventure Generic`.

### 6.4 Typography

| Font               | Role         | Usage                                                                               |
| ------------------ | ------------ | ----------------------------------------------------------------------------------- |
| **Press Start 2P** | Display only | App name, level numbers, badge titles. ≥12pt, all-caps, max 4 mots. JAMAIS en body. |
| **Fredoka**        | Headings     | h1-h3, CTA buttons, tab labels. Weights 400/500/600/700.                            |
| **Nunito**         | Body         | Paragraphes, lists, forms. Tabular nums via `font-feature-settings: 'tnum'`.        |

Type scale (8pt base) :

```
display-xl   40px  Fredoka 700  / Press Start 2P 24px
display-lg   32px  Fredoka 700  / Press Start 2P 20px
h1           28px  Fredoka 700
h2           24px  Fredoka 600
h3           20px  Fredoka 600
h4           18px  Fredoka 500
lead         18px  Nunito 500
body         16px  Nunito 400  (DEFAULT)
small        14px  Nunito 400
caption      12px  Nunito 500
mono-num     16px  Nunito 500 + tabular
pixel-label  12px  Press Start 2P
```

Line-height : 1.5 body, 1.2 headings.

**Readable Mode toggle** dans settings : swap Press Start 2P → Fredoka Bold globalement (a11y kill switch).

### 6.5 Design System Components

11 composants core spécifiés (cf doc design détaillé) :

- `PixelButton` (primary/secondary/ghost/accent/danger) — border 3px + hard shadow 4px
- `PixelCard` — border 3px + hard shadow 6px
- `PixelDialog` / `PixelBottomSheet` — spring entrance
- `PixelInput` — 48pt min, focus state primary border
- `PixelChip` — pill, multi-select friendly
- `PixelToggle` — spring knob
- `PixelTabBar` — bottom nav 5 tabs max
- `PixelAvatar` — sprite + mood badge (Waze-style)
- `PixelToast` — slide spring, auto-dismiss 4s
- `PixelProgressBar` — XP-style avec sparkle on complete
- `LevelSelectNode` + `LevelSelectEdge` — path Duolingo + Bézier SVG
- `MapMarker` — sprite + bubble, cluster si overlap

### 6.6 Information Architecture

5 bottom tabs :

1. 🏠 **Home** — snapshot today + smart reminders + current trip
2. 🗺️ **My Trips** — liste trips, top sub-tabs dans trip : Path / Map / Crew / Docs / Checklist / Memories
3. 🔭 **Discover** (v1.1 main) — map + list public trips
4. 📬 **Inbox** — notifs centralisées
5. 👤 **Profile** — passport + achievements + settings

### 6.7 UX guidelines per scenario

(Détails complets dans le design doc Section 3.)

- Empty states : sprite + sentence-coup-de-pouce + 1 primary action
- Onboarding : 4 écrans skippables
- Trip creation : modal full-screen, 3 sections progressively disclosed
- Milestone creation : bottom sheet, type chips + sprite picker
- Discovery card : postcard collectible (NOT Tinder)
- Publish-to-discovery : 7-step bottom sheet flow
- Smart reminders : 4-action card (Done / Add to checklist / Snooze / Open)
- Live presence : avatars gravitate + cluster on overlap
- Achievement unlock : Mario "World Clear" cinematic 2.5s
- Permission requests : pre-permission priming screen (game unlock framing)

### 6.8 Animation & micro-interactions

- 150-200ms button press, spring physics
- 250-300ms modal entrance, 180ms exit
- 600ms path stroke fill on completion
- 2.5s achievement cinematic (skippable)
- 30fps lerp for avatar gravitation
- Respect `prefers-reduced-motion`

### 6.9 Haptics & Sound

- **Haptics** : light (button), selection (toggle), medium (milestone), success notification (achievement), error notification (form). User toggle "Reduce haptics" in settings, respects iOS Reduce Haptics system setting.
- **Sound — defaults explicites** (settings granular, asked during onboarding "Want sound effects? [Yes / Later]") :
  - UI sounds (button blips, toggle clicks) : default **OFF** (low signal, can annoy)
  - Event sounds (coin unlock, achievement fanfare, milestone power-up) : default **ON if user said Yes**, OFF if Later
  - Music chiptune ambient (in trip view) : default **OFF** (opt-in user)
  - Master volume slider always available, defaults to 60%
- **NEVER** sound during sensitive flows (privacy settings, sign-in, future payment)
- 8-10 SFX bundled (Kenney audio packs, CC0), 4-6 chiptune loops one per world theme (Soundimage CC-BY 4.0 or Pixabay)

### 6.10 Accessibility

- Press Start 2P ≥12pt + Readable Mode
- All sprites have accessibilityLabel
- Color never sole indicator
- AA contrast verified
- Dynamic type tested 100/150/200%
- Reduced motion supported
- Touch targets ≥44pt

---

## 7. Map system

### 7.1 2-layer architecture

```
ZOOM 6-9     ZOOM 9-11        ZOOM 11+
[Overworld]  [Crossfade]      [Real Map Stylized]
SVG/Canvas   Reanimated       MapLibre native
hand-crafted opacity 1→0      tiles vector
par theme    + camera sync    style JSON custom
```

### 7.2 Overworld (Layer A)

- Background tileset PNG (Aseprite) par world theme — 1024×1536 portrait
- Decorative sprites layer (Skia Canvas) : nuages drifting, vagues, flags
- Milestone nodes layer (SVG) : sprite par type, position lat/lng → x/y via Mercator simplifié
- Path layer (SVG Bézier cubique) : stroke states locked/available/completed
- Live avatars layer (Skia) : lerp position + walk cycle + cluster

### 7.3 Real Map Stylized (Layer B)

- `@maplibre/maplibre-react-native` (EAS dev client requis)
- Tuiles via MapTiler free tier (100k req/mois)
- Style JSON custom designé dans Maputnik
- Style "Cozy Map" : couleurs flat palette, routes 4-6px primary-600, eau sky-500, parks secondary-500, simplification labels, polices Fredoka

### 7.4 Crossfade

- Reanimated `sharedValue` `zoomLevel`
- Interpolate opacity overworld + realMap
- Pointer events sync (which layer is interactive)
- Camera sync lat/lng + bearing

### 7.5 Density management

- Cluster threshold 40px screen
- PixelCluster avec count badge
- Tap → spread radially spring 400ms

### 7.6 Offline maps

- MapLibre offline pack par bbox(trip), zoom 8-16
- Auto-DL T-14j du trip OR manuel via settings
- Storage budget 50-200MB par trip
- Auto-evict après end_date + 30j
- User can pin indefinitely

---

## 8. Realtime architecture

### 8.1 Channel topology

```
trip:{tripId}
├── Presence track (slow state)
│     { user_id, avatar_sprite, color, status, current_milestone_id }
├── Broadcast "position" (high freq, ephemeral)
│     { lat, lng, heading, accuracy, ts }
└── Postgres Changes
      checkins / milestones / photos / polls / reactions / time_capsules

user:{userId}
└── Postgres Changes
      trip_join_requests / trip_smart_reminders / trip_invitations
```

### 8.2 Throttling

- Position broadcast : 5s OR 50m delta via expo-location
- Backup DB write `last_known_position` every 60s
- Presence : on state change only
- Adaptive throttle selon battery + activity + appState

### 8.3 Conflict resolution

- Optimistic UI client
- Server timestamp check
- Conflict banner avec [View their version / Keep mine / Merge]
- Reorder : fractional `order_index` decimal (anti-conflict naturel)
- Offline reconcile : mutation queue flush on reconnect

### 8.4 Privacy controls

- Per-trip location_sharing setting : precise / city_only / paused / never
- Panic toggle "Hide live for 1h" omnipresent
- Non-friends (v1.1 discovery) ne voient que city_only (round lat/lng to 0.1)

### 8.5 Reliability

- Realtime NOT guaranteed delivery
- State reconciliation via REST on reconnect
- Exponential backoff retry
- "Offline" banner UI when disconnected
- "Last update Xm ago" indicator

### 8.6 Push notifications

- Expo Push Service
- DB webhooks trigger Edge Function "send_push"
- Categories : friends_checkin, friends_photo, smart_reminders, join_requests (always on), polls, achievements, quiet_hours
- User preferences per category
- Quiet hours 22h-8h respected

---

## 8.5 Passport verification & MRZ parsing — strategy

### 8.5.1 Pourquoi c'est critique

Les smart reminders sont **précis uniquement si on connaît le pays de passeport**. Un user :

- 🇫🇷 Français qui va aux 🇺🇸 USA → besoin **ESTA** ✓
- 🇨🇦 Canadien qui va aux 🇺🇸 USA → **PAS** d'ESTA (visa waiver direct via passeport) ✗
- 🇯🇵 Japonais qui va aux 🇺🇸 USA → besoin **ESTA** ✓ (mais durée et conditions différentes)

Sans pays de passeport, on ne peut pas donner les bons rappels. C'est non-négociable pour la valeur produit.

### 8.5.2 Stratégie en 4 tiers — TOUS dispos en v1.0

L'user choisit son niveau au moment du setup passeport (et peut upgrader à tout moment).

| Tier                                      | Méthode                                                                                              | Coût dev                                               | UX      | Badge          | Use case                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------- | -------------- | ------------------------------------------------------------------ |
| **Tier 0 — Skip**                         | Passeport pas configuré                                                                              | $0                                                     | 0s      | aucun          | Lazy setup, smart reminders limités (génériques destination)       |
| **Tier 1 — Self-declared**                | Picker pays dans onboarding                                                                          | $0                                                     | 5s      | aucun          | Quick setup, smart reminders fonctionnent                          |
| **Tier 2 — MRZ OCR on-device**            | Photo de la zone MRZ du passeport (2 lignes en bas, OCR-able), parsing local extrait pays/expiry/nom | **$0** (on-device, no API call, no data leaves device) | 30s     | aucun          | **Recommandé** : précision + free + passport expiry tracking       |
| **Tier 3 — Stripe Identity verification** | Full verification (selfie + passport scan + AI fraud detection)                                      | **~$1.50/check**                                       | 2-3 min | **✓ Verified** | Pour Discovery (trust signal), women-only spaces, reputation boost |

**Important** : les 4 tiers sont **opt-in séparément**. La majorité des users démarre Tier 1 ou 2 (free). Tier 3 est pour ceux qui veulent le badge ✓Verified — ce qui devient utile surtout en v1.1+ Discovery.

### 8.5.3 Stripe Identity — coût & monitoring

- ~$1.50 par session vérifiée
- Estimation prudente : si 10-20% des users vont jusqu'au Tier 3 → 100-200 verifications/mois = $150-300/mois
- **Cost monitoring** : alerte Sentry custom quand spend Stripe > $200/mois → review
- **Cap stratégique** : si > $300/mois, on switch alternative (Veriff, Persona, comparables prix) OU on cap les nouvelles verifications avec waitlist
- **Reattribution coûts** : si l'app génère plus tard des revenues (v2 premium), absorber les coûts d'identity en interne sans répercuter user-side

### 8.5.4 Implementation v1.0

### 8.5.5 Implementation v1.0 — onboarding flow

```
Welcome screen: "Passport setup — get personalized smart reminders"

Options présentés:
┌────────────────────────────────────────────┐
│ ★ Full verification (~2 min)               │
│   Stripe Identity. Get ✓Verified badge.    │
│   [Verify with Stripe →]                   │
├────────────────────────────────────────────┤
│ ⚡ Quick scan (30s)                         │
│   Photo of passport MRZ. Data stays local. │
│   [Scan passport →]                        │
├────────────────────────────────────────────┤
│ ✏️ Type manually (5s)                       │
│   Just nationality + expiry date.          │
│   [Enter manually →]                       │
├────────────────────────────────────────────┤
│  Skip for now                              │
└────────────────────────────────────────────┘

User can upgrade from any tier later in Settings → Profile.
```

**Pour MRZ OCR (Tier 2)** :

```ts
// expo-camera + react-native-text-recognition (ML Kit native, free)
1. Camera opens with MRZ frame guide overlay
2. Detect 2 lines starting with 'P<' (passport format ICAO 9303)
3. Parse:
   - Country code (3 chars)
   - Surname / Given names
   - Passport number
   - Nationality (3 chars)
   - Date of birth
   - Sex
   - Expiry date
4. Confirm extracted data → save to profile (encrypted via Supabase Vault)
5. Passport image NEVER uploaded, parsed text only
```

**Pour Stripe Identity (Tier 3)** :

```ts
// Stripe Identity Native SDK + Supabase Edge Function backend
1. App calls Edge Function `start_identity_verification` → returns session URL
2. Stripe SDK opens verification flow (passport scan + selfie + checks)
3. On complete, webhook to Edge Function updates user.verification_level = 3
4. Profile gets ✓Verified badge
5. Verified passport data (country, expiry, name) overrides any prior data
```

### 8.5.4 Privacy & security

- **MRZ data stays on-device by default** (no upload of passport image)
- User EXPLICITLY consents to save extracted text in profile
- Passport image NEVER stored (only parsed text)
- Extracted data **encrypted at rest** via Supabase Vault or app-level encryption
- User can delete passport data anytime in Settings
- Stripe Identity (v1.2) sends data to Stripe — clear consent screen + GDPR-compliant

### 8.5.6 MCP integration pour le dev workflow

User a mentionné qu'il filera une connexion MCP. Plusieurs sont déjà disponibles dans l'env (Supabase MCP, Vercel MCP, Linear MCP, Figma MCP, etc.).

**Utilité concrète** :

- Supabase MCP : créer tables, migrations, RLS policies, Edge Functions, list/edit data directement depuis Claude
- Vercel MCP : déployer landing page
- Linear MCP : créer issues pour les tasks du plan
- Figma MCP : si le user a des mockups Figma

À configurer en Phase 0 (bootstrap). Ça accélère le dev significativement.

---

## 9. Smart Reminders system

### 9.1 Knowledge base

- ~150-200 rules curées manuellement v1.0
- Top 30 destination countries × top 10 passport countries × ~10 types
- Examples : ESTA (USA, FR pass), ETA UK, ETIAS, vaccins fièvre jaune, validité passeport, IC card Japon, etc.
- Maintenue par nous, refresh trimestriel
- Sources officielles citées
- i18n FR + EN day 1

### 9.2 Rules engine

- Edge Function cron 2×/jour
- Eval conditions : destination_country × passport_country × duration × purpose
- Insert into trip_smart_reminders pending
- Send push at lead_times (e.g. T-60, T-30, T-7)

### 9.3 UI

- Smart Tips section dans trip view
- Card avec title/body/action_url + 4 actions (Done / Add to checklist / Snooze 7d / Open)
- Inbox tab aggrège tous les pending
- Settings : enable/disable global + mute per category

### 9.4 Réconciliation principe "user-driven content"

- JAMAIS d'item auto-créé dans la checklist sans consentement
- Reminders = suggestions contextuelles
- Si user "Add to checklist" → devient un item normal éditable

### 9.5 Personal global reminders (life-cycle docs)

**Différent des smart reminders trip-spécifiques** : ce sont des rappels liés à la vie de l'user, indépendants d'un trip.

| Type                        | Trigger                                | Lead times default           | Source                               |
| --------------------------- | -------------------------------------- | ---------------------------- | ------------------------------------ |
| **Passport expiry**         | passport_expires_at extracted ou input | [180, 90, 30, 7] jours avant | MRZ OCR OR Stripe Identity OR manual |
| **Visa expiry** (v1.x)      | User adds visa to docs                 | [60, 30, 7]                  | Manual upload + user input expiry    |
| **Driving license** (v1.x)  | User opt-in setup                      | [60, 14]                     | Manual                               |
| **Travel insurance** (v1.x) | User adds insurance doc                | [30, 7]                      | Manual                               |
| **ESTA expiry** (USA)       | Auto-detected if doc tagged ESTA       | [60, 30]                     | Manual ou OCR                        |

**Tu pars en voyage dans 8 mois, ton passeport expire dans 5 mois ?** → notif **6 mois avant expiry** dit "🛂 Ton passeport expire dans 6 mois. Renouvellement = 2-6 semaines. Pense à l'anticiper avant ton prochain trip."

```sql
personal_reminders
  id uuid PK
  user_id uuid FK
  reminder_type text                   -- 'passport_expiry' | 'visa_expiry' | etc.
  related_document_id uuid FK NULL     -- si lié à un doc uploadé
  target_date date                     -- date d'expiration
  title text                           -- i18n key
  body text                            -- i18n key
  lead_times int[]                     -- [180, 90, 30, 7]
  status text default 'active'         -- 'active' | 'snoozed' | 'dismissed' | 'completed'
  snooze_until timestamptz NULL
  last_notified_at timestamptz NULL
  notifications_sent_at timestamptz[]
  created_at, updated_at

CREATE INDEX idx_personal_reminders_user_date ON personal_reminders(user_id, target_date);
```

**Auto-creation rules** :

- Quand MRZ OCR ou Stripe Identity extrait `passport_expires_at` → insert personal_reminder type=`passport_expiry` automatiquement (opt-in checkbox dans le confirm screen)
- Quand user upload un doc et tag "visa" / "ESTA" + saisit une expiry date → option "Remind me before this expires"
- User peut create manuellement n'importe quel reminder personnel via Settings → Reminders

**Edge Function cron** quotidien :

- Loop tous les personal_reminders actifs
- Si `today + lead_time == target_date` → schedule push notification
- Mark notification sent

**UI** : nouveau tab dans Inbox → "Life reminders" séparés des trip smart reminders. Settings dédié pour mute par type.

---

## 9.5 i18n strategy — key-driven, extensible, zéro hardcode

### 9.5.1 Principes non-négociables

1. **ZÉRO string hardcodée dans le code** (sauf logs dev / error messages internes). Toute string user-facing = lookup via `t('key.path')`
2. **Translation keys hiérarchiques par feature** : `auth.signIn.button`, `trips.create.title`, `smartReminders.esta.title`
3. **Fallback chain** : current locale → English → key (jamais d'undefined affiché)
4. **Pluralisation** native (i18n-js supporte ICU MessageFormat)
5. **Date/Time/Number locale-aware** via `Intl` natif
6. **RTL anticipé** dans le design (mirroring layouts), implémenté quand on ajoute Arabic/Hebrew

### 9.5.2 Stack

```ts
// /src/core/i18n/index.ts
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const i18n = new I18n({ en, fr });
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export const t = (key: string, options?: any) => i18n.t(key, options);

// Hook
export const useTranslation = () => ({
  t,
  locale: i18n.locale,
  setLocale: (loc: string) => {
    i18n.locale = loc; /* persist */
  },
});
```

### 9.5.3 Files structure

```
/src/core/i18n/locales/
  /en.json                    # source of truth (we write English first)
  /fr.json                    # day 1 launch
  /es.json                    # v1.1 community contribution likely
  /de.json                    # v1.x
  /ja.json                    # v1.x
  /pt.json                    # v1.x
  ...
```

### 9.5.4 Translation key format

```json
{
  "auth": {
    "signIn": {
      "title": "Welcome back, adventurer!",
      "subtitle": "Sign in to continue your journey",
      "magicLinkButton": "Send me a magic link",
      "appleSignInButton": "Sign in with Apple",
      "googleSignInButton": "Sign in with Google"
    }
  },
  "trips": {
    "create": {
      "title": "New Adventure",
      "namePlaceholder": "e.g., USA West Coast 2026",
      "dates": "When?"
    },
    "list": {
      "empty": {
        "title": "Your adventures await",
        "subtitle": "Tap + to create your first trip",
        "cta": "Create my first trip"
      }
    }
  },
  "smartReminders": {
    "esta": {
      "title": "ESTA required for USA",
      "body": "If staying ≤ 90 days, ESTA is required. Apply min 72h before, recommended 1 month. $21, valid 2 years.",
      "actionLabel": "Apply for ESTA now"
    },
    "ukEta": { ... },
    "japanIcCard": { ... }
  },
  "achievements": {
    "firstTrip": {
      "name": "First Trip",
      "description": "Created your first adventure"
    }
  }
}
```

### 9.5.5 Smart reminders body translations

**Critical** : `country_requirements` table dans Postgres stocke `i18n_key` (e.g., `smartReminders.esta`). Le **contenu** est dans les fichiers de translation, pas dans la DB. Permet :

- Mise à jour des copy sans migration DB
- Translation community via PRs sur les locales JSON
- Reviews légales par language (avocats locaux peuvent valider la copy)

### 9.5.6 Community translation v1.x

Une fois v1.0 lancé, on ouvre les translations à la community :

- Repo GitHub avec PRs welcomed sur `/src/core/i18n/locales/`
- Tool Crowdin OU Lokalise self-host pour interface user-friendly
- Reward translators avec badge "Polyglot" + credit dans About screen

### 9.5.7 i18n linter

ESLint rule custom OU `eslint-plugin-i18n` qui FAIL le build si :

- String literal trouvée dans JSX (sauf whitelist : keys, classNames, etc.)
- Key référencée mais pas dans en.json (source of truth)
- Translation manquante dans une locale non-anglaise → warning (pas error, fallback OK)

---

## 10. Discovery & Social (v1.1)

### 10.1 Trip visibility levels

- `private` (default) : members only
- `unlisted` : anyone with link can VIEW
- `public_view` : discoverable, view-only
- `open_to_join` : discoverable + accept join requests

### 10.2 7-step publish-to-discovery flow

1. Number of joiners (slider 1-10)
2. Open to genders (multi-select default all)
3. Vibe match (chips)
4. Age range (optional 18+)
5. Joinable segments
6. Note to joiners (280 chars)
7. Joiner requirements (verified toggle)

### 10.3 Discovery feed

- Map view + list view toggle
- Filters bar : where / when / vibe / group size / I am (gender for matching)
- PixelCard postcards (NOT swipe)
- Tap → public trip view
- "Ask to Join" modal with message + segment proposal

### 10.4 Match score

- 0-100 calculé : gender alignment (binary), age range (15), vibes overlap (25), languages (15), verification (15), reputation (15), profile completion (10), past trips (5)
- Affiché à l'host pour trier, pas au joiner

### 10.5 Safety (non-négociable)

- Private by default
- Location obfuscation pour non-friends (city only)
- Report/block boutons partout
- No DM tier-zero (1 request msg + handle exchange post-accept)
- Email verification obligatoire pour publier public
- Rate limiting join requests (max 5 pending, max 20/sem)
- Phone verification optional pour Verified badge
- T&S email + SLA 24h
- Age 18+ pour public, 13+ (16 EU) pour private
- Onboarding consent screens explicites
- Cooldown gender change (90j) anti-imposture
- Women-only spaces gated par verification level 2+

---

## 11. OSS Foundation

### 11.1 Mapping component → source repo

| Brique                    | Source                            | Licence              | Action                             |
| ------------------------- | --------------------------------- | -------------------- | ---------------------------------- |
| Schema data               | AdventureLog                      | GPL-3.0              | **Inspiration only**, no code copy |
| Path UI                   | bryanjenningz/react-duolingo      | MIT                  | **Port en RN** + attribution       |
| Algo indentation cyclique | sanidhyy/duolingo-clone           | MIT                  | **Algo réutilisé** + attribution   |
| Pixelize shader (v1.x)    | chbornman/rpg-pixel-map-generator | MIT                  | **Pipeline forké**                 |
| Map native                | @maplibre/maplibre-react-native   | BSD-3                | Dep                                |
| Map style editor          | Maputnik                          | MIT                  | Outil dev                          |
| Sprites                   | Kenney.nl packs                   | CC0                  | Bundled                            |
| Sprites animés            | Pixel Frog itch.io                | CC-BY-4.0            | Bundled + attribution              |
| Realtime                  | Supabase Realtime                 | Apache 2.0           | SDK                                |
| UI tokens reference       | NES.css                           | MIT                  | Inspiration only                   |
| Fonts                     | Press Start 2P, Fredoka, Nunito   | OFL                  | Bundled                            |
| Music                     | Soundimage.org / Pixabay          | CC-BY 4.0 / Pixabay  | Bundled + attribution              |
| SFX                       | Kenney audio packs                | CC0                  | Bundled                            |
| Icons                     | Lucide React Native               | ISC                  | Dep                                |
| Map tiles                 | MapTiler Cloud                    | Commercial free tier | API key                            |
| Geocoding                 | MapTiler / Nominatim              | Commercial / ODbL    | API                                |
| Weather                   | Open-Meteo                        | Free, no auth        | API                                |
| Routing                   | OSRM demo                         | BSD-2                | API                                |

### 11.2 License compliance

- `LICENSE` (MIT pour notre code)
- `CREDITS.md` avec toutes attributions (CC-BY 4.0 et MIT names)
- About screen in-app avec lien vers credits
- CI lint pour détecter nouvelles deps sans license documentée

---

## 12. Phases & Timeline

### 12.1 Phases v1.0 (23 semaines, ~5,5 mois à 20h/sem)

| Phase | Sem   | Contenu                                                                                    | Livrable                             |
| ----- | ----- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| 0     | 1     | Bootstrap (repo, EAS, Supabase, design tokens, CI)                                         | App boote "Hello Journey"            |
| 1     | 2-3   | Auth + Trips foundation + RLS                                                              | User crée trip, invite copain        |
| 2     | 4-5   | Path UI + Milestones                                                                       | Trip en mode Duolingo path           |
| 3     | 6-8   | Overworld + Real Map + Crossfade                                                           | Pinch → crossfade fluide             |
| 4     | 9-10  | Documents + Checklist + Smart Reminders                                                    | User upload ESTA, smart tips à temps |
| 5     | 11-12 | Realtime + Live Avatars                                                                    | 2 users se voient sur map live       |
| 6     | 13    | Achievements + Passport + Sound                                                            | Badges + cinematics + audio          |
| 7     | 14-15 | Cherry-on-top (polls, photos, reactions, météo, distance, scrapbook, .ics)                 | Trip vivant                          |
| 8     | 16-17 | Bold gambits (3 world themes + boss + time capsule + random encounters + caravan)          | App riche                            |
| 9     | 18    | Sociale foundation (public link, profile public)                                           | Schema v1.1 prêt                     |
| 10    | 19-20 | Stores polish (onboarding, empty states, settings, i18n, a11y, screenshots, icons, splash) | App submit-ready                     |
| 11    | 21-22 | Beta TestFlight + Play Internal (15-25 testers)                                            | App stable                           |
| 12    | 23    | Submission stores                                                                          | 🚀 Launch v1.0                       |

⚠️ Go/no-go gates Phase 8 et 10 — couper gambits si besoin → v1.1.

### 12.2 Phases post-launch

- **v1.1** (4-6 sem) : Discovery + Join + Verification light + T&S
- **v1.2** (4 sem) : Reviews + Verification full + Filters + Messaging
- **v1.3** (4-6 sem) : Templates community + Public showcase + Follow + Web companion

---

## 13. Stores readiness checklist

### 13.1 iOS App Store

- Bundle ID `com.thisisthejourney.app`
- App Store Connect + Apple Dev Program ($99/an)
- App icon 1024×1024
- Screenshots 6.7"+6.5"+5.5" FR+EN
- App preview video (optional)
- Privacy policy URL + Terms URL hosted
- Privacy Nutrition Labels
- Age rating 17+ (UGC + Social)
- Promotional text + Description + Keywords
- TestFlight build

### 13.2 Android Play Store

- Google Play Console ($25 one-time)
- App icon 512×512 + adaptive
- Feature graphic 1024×500
- Screenshots phone FR+EN
- Privacy policy URL + Data Safety form
- Age rating IARC
- Short + full description
- Internal testing track

### 13.3 Legal / Compliance

- Privacy policy revue
- Terms of Service revus
- GDPR right to delete + data export
- DPA Supabase signed
- T&S email + workflow doc (SLA 24h)
- Age gate 13+ / 16 EU

---

## 14. Risks & Mitigations

| Risk                                    | Likelihood | Impact  | Mitigation                                                      |
| --------------------------------------- | ---------- | ------- | --------------------------------------------------------------- |
| Scope slippage                          | High       | High    | Go/no-go gates, cut gambits → v1.1                              |
| MapLibre+Skia perf bas-de-gamme Android | Medium     | High    | Profile Phase 3, fallback simple mode                           |
| Adoption sociale lente                  | Medium     | Medium  | Private mode = primaire, social = bonus                         |
| T&S sous-staffé                         | Medium     | High    | Workflow strict day 1, gating publication                       |
| Store rejection                         | Low-Med    | High    | Nutrition labels + 17+ + T&S URL preflight                      |
| Burn-out solo dev                       | Medium     | High    | 20h/sem soutenable, pas crunch                                  |
| Pixel art rejet mainstream              | Low        | Medium  | Beta target large, Readable Mode option                         |
| Coût Supabase scale                     | Low        | Medium  | Free → Team $25/mo après 50k MAU                                |
| OSS license oversights                  | Low        | Low-Med | CI audit + pre-launch checklist                                 |
| Press Start 2P a11y break               | High       | High    | Readable Mode + ≥12pt + 4-word max + auto-swap at 150%+ DT      |
| Gender prefs exclusionary feel          | High       | High    | Positive framing + multi-select + no swipe + LGBTQ+ beta review |
| Empty states paralyzing                 | Medium     | Medium  | Sprite + sentence + 1 action, user test <30s to action          |
| Sound fatigue                           | Medium     | Low     | Default OFF post-onboarding, granular settings                  |

---

## 15. Monétisation & Coûts — Stratégie 100% gratuit

### 15.1 Pour les USERS : 100% gratuit, à vie sur les features core

- Pas d'IAP, pas de subscription, pas de paywall, pas d'ads
- Tout le scope v1.0 + v1.1 + v1.2 + v1.3 reste gratuit pour les users
- JAMAIS : ads, sell user data, paywall basic features, sponsored content non-labeled, dark patterns
- v2+ éventuelle : explorations possibles (themes cosmétiques premium opt-in, affiliate links transparent opt-in), MAIS jamais bloquer une feature de base

### 15.2 Pour MOI le dev : coûts minimisés au maximum

**Hard floors incompressibles pour publier sur les stores** :

| Service                             | Coût         | Status user                        |
| ----------------------------------- | ------------ | ---------------------------------- |
| **Apple Developer Program**         | $99/an       | ✅ **Déjà payé** (compte existant) |
| **Google Play Console**             | $25 one-time | ✅ **Déjà payé** (compte existant) |
| **Coût incrémental pour ce projet** | **$0**       | —                                  |

**Tout le reste reste 100% gratuit** pendant la durée du dev + bien après le launch :

| Service                               | Plan                                                                         | Limite free                                     | Quand on pourrait basculer                             |
| ------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **Supabase**                          | Free                                                                         | 500MB DB, 1GB Storage, 2GB egress/mois, 50k MAU | ~10-50k DAU réels                                      |
| **MapTiler**                          | Free                                                                         | 100k requêtes/mois                              | ~5k DAU actifs                                         |
| **Open-Meteo**                        | Free                                                                         | Illimité (no auth)                              | Jamais                                                 |
| **OSRM**                              | Self-host gratuit (Fly.io free tier 3 shared-1x VMs OR Railway $5 credit/mo) | Sufficient pour MVP                             | Si scale extrême                                       |
| **Expo / EAS Build**                  | Free                                                                         | 30 builds/mois                                  | Strategy OTA via EAS Updates pour éviter native builds |
| **EAS Updates**                       | Free                                                                         | Illimité OTAs                                   | Jamais en réalité                                      |
| **Sentry**                            | Developer                                                                    | 5k errors/mois, 10k performance units           | ~50k DAU                                               |
| **PostHog**                           | Free                                                                         | 1M events/mois                                  | ~5k DAU actifs                                         |
| **Expo Push Notifications**           | Free                                                                         | Illimité                                        | Jamais                                                 |
| **GitHub**                            | Free                                                                         | Repos privés illimités, 2000 min Actions/mois   | Solo dev = jamais                                      |
| **Resend ou Brevo (SMTP magic link)** | Free                                                                         | 100/jour (Resend) ou 300/jour (Brevo)           | Suffisant MVP, sinon free Supabase SMTP                |
| **Vercel (landing page)**             | Hobby                                                                        | 100GB bandwidth/mois                            | Jamais pour landing                                    |
| **Lucide icons**                      | OSS                                                                          | Illimité                                        | Jamais                                                 |
| **Kenney assets**                     | CC0                                                                          | Illimité                                        | Jamais                                                 |

### 15.3 Si même les $124 sont trop : 3 stratégies de contournement

| Stratégie                              | Coût              | Trade-off                                                                                     |
| -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| **A. Ship Android-only en v1.0**       | $25 one-time      | Iphone-users exclus du launch. Add iOS v1.1 quand budget ok.                                  |
| **B. TestFlight only iOS**             | $99/an quand même | Apple Dev requis même pour TestFlight, donc pas vraiment économie                             |
| **C. Distribution direct APK Android** | $0                | Loupe Play Store, friction install (sideload), pas de discoverability, perte de trust signals |

**Reco** : payer les **$124 year 1** + **$99/an** ensuite. C'est < le prix d'un Netflix annuel et c'est la base d'avoir une app sérieuse publiée.

### 15.4 Coûts ANTICIPÉS v1.0+ (acceptés par user)

| Item                             | Coût                            | Quand                                     | Status                                             |
| -------------------------------- | ------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| Domaine `thisisthejourney.app`   | ~$15/an (Namecheap, Cloudflare) | Optional, mais trust signal               | À voir avec user                                   |
| **Stripe Identity verification** | **~$1.50/check**                | **v1.0** opt-in user pour badge ✓Verified | ✅ **Validé par user**, cap monitoring $200-300/mo |

### 15.5 Coûts éventuels plus tard (NON v1.0)

| Item                               | Coût                                                                 | Quand                                        |
| ---------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Verification phone (Twilio Verify) | $0.05/check                                                          | v1.2 (opt-in user pour badge phone Verified) |
| Self-hosted OSRM upgrade           | $5-10/mo VPS (DigitalOcean, Hetzner) si Fly.io free tier insuffisant | Si scale ou perf besoin                      |
| Supabase Team plan                 | $25/mo                                                               | À ~50k MAU                                   |
| EAS Production plan                | $29/mo                                                               | Si beta très intense, sinon évitable         |
| Email service paid (Resend Pro)    | $20/mo (50k emails)                                                  | À 10k+ MAU                                   |

### 15.6 Run rate estimé pour la première année

(Apple Dev + Google Play déjà payés, donc $0 incrémental sur ces lignes.)

| Scénario                                            | Coût year 1 (incrémental) |
| --------------------------------------------------- | ------------------------- |
| **Minimum publication 2 stores + tout free tier**   | **$0**                    |
| + Domaine (recommandé `thisisthejourney.app`)       | $15-30                    |
| + Stripe Identity (50-200 checks/mois × $1.50 × 12) | $900-3600                 |
| + EAS Production occasionnel (1 mois beta intense)  | +$29                      |
| + Mois où Supabase passe Team (improbable v1.0)     | +$25/mo                   |

**Estimation pragmatique year 1** :

- **Scénario bas** (~50 Stripe verifications/mois) : **~$900 + domaine $30 ≈ $930/an**
- **Scénario médian** (~100 Stripe/mois) : **~$1800/an**
- **Scénario haut** (~200 Stripe/mois) : **~$3600/an** → décision: cap ou switch alternative

**Note** : Stripe Identity = la seule ligne notable. Si on revoit l'opt-in (genre "Verify only when ready for Discovery"), on peut réduire significativement.

### 15.6 Stratégie de cost-monitoring

- Dashboard mensuel : vérifier usage chaque service vs free tier
- Alertes 80% du quota free (Supabase, MapTiler, PostHog, Sentry)
- Si on touche un seuil : décision (optimise OR upgrade plan OR adapt feature)
- Pas de paiement automatique de upgrade — toujours alerte manuelle d'abord

---

## 16. Open questions (à trancher, non-bloquant pour writing-plans)

- [ ] Bundle ID définitif (proposition : `com.thisisthejourney.app`)
- [ ] Choix domaine landing page (`thisisthejourney.app` si dispo)
- [ ] Stripe Identity vs Onfido pour v1.2 verification full (à trancher plus tard, optional)
- [ ] Beta testers recruitment : channels précis (Twitter? Discord? IRL?)
- [ ] Marketing launch : qui pour outreach travel blogs ?
- [ ] Brand colors final lock : palette Cozy Arcade peut bouger marginalement après design pass à blanc

**Decisions tranchées** :

- ✅ Apple/Google sign-in en **v1.0** (en plus de magic link)
- ✅ Coûts publication stores : $0 incrémental (comptes Apple Dev + Google Play déjà existants)
- ✅ Strict 100% gratuit pour les users (à vie sur scope core, jamais ads / paywall / data selling)

---

## 17. Appendix

### 17.1 Personas

1. **Camille, 28, FR, design produit** — voyage USA avec 4 copains août 2026. Veut centraliser docs + voir où sont les copains en road trip. Découvre l'app par bouche-à-oreille.

2. **Marie, 24, FR, étudiante en année de césure** — backpack Asie 3 mois. Solo au départ, veut trouver des co-voyageuses pour certaines étapes (women-only). Découvre l'app via Insta.

3. **Alex, 32, US, digital nomad** — déjà passé par 30+ pays. Veut partager ses itinéraires + connect avec d'autres nomades. Power user du discovery.

4. **Sophie & Tom, 42, FR, couple parents** — vacances famille Japon. Pas tech-savvy, veulent l'app simple pour planifier + montrer l'itinéraire aux enfants. Sound off, Readable Mode on.

### 17.2 Key user flows summary

1. **Signup → First trip created** : <5 min
2. **Add first milestone** : <30s from empty state
3. **Invite a friend** : <20s
4. **Upload first document** : <40s
5. **Check in at a milestone (live)** : <10s
6. **See another user's avatar on map** : auto (live)
7. **Receive first smart reminder** : within 24h of trip creation if applicable
8. **Unlock first achievement** : after first milestone created
9. **Generate scrapbook at trip end** : <30s

### 17.3 References

- AdventureLog (data model inspiration) : https://github.com/seanmorley15/AdventureLog
- bryanjenningz/react-duolingo (path UI base) : https://github.com/bryanjenningz/react-duolingo
- sanidhyy/duolingo-clone (algo indentation) : https://github.com/sanidhyy/duolingo-clone
- chbornman/rpg-pixel-map-generator (shader pipeline) : https://github.com/chbornman/rpg-pixel-map-generator
- MapLibre : https://github.com/maplibre/maplibre-react-native
- Maputnik : https://github.com/maplibre/maputnik
- Kenney assets : https://kenney.nl/assets
- Supabase Realtime Presence : https://supabase.com/docs/guides/realtime/presence
- Open-Meteo : https://open-meteo.com/
- Expo Push : https://docs.expo.dev/push-notifications/overview/

---

**End of spec.**

Next step : user review → corrections inline → invocation `writing-plans` (= /ultraplan) for implementation plan.
