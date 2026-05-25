# Phase 1 — Auth + Trips Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (or inline execution). Each task uses checkbox (`- [ ]`) syntax. **After every code task, invoke the `code-validator` agent (mandatory per CLAUDE.md).**

**Goal:** Deliver a working app where a user can: sign up via magic link, create their profile (avatar sprite + passport country), create a trip with dates/destination, invite a friend by magic link, see their trips in a `My Trips` tab, and navigate the 5-tab shell. Plus a 4-component design system foundation (PixelButton, PixelCard, PixelInput, PixelChip).

**Architecture:** Feature-based SOLID modules (`/features/auth`, `/features/profile`, `/features/trips`). Supabase Postgres + RLS for all tables. Email magic link via Supabase Auth (Apple/Google sign-in deferred to Phase 1.5). Profile passport setup uses Tier 1 (self-declared country) for now; Tier 2 MRZ OCR and Tier 3 Stripe Identity in Phase 1.5. Expo Router file-based navigation with `(auth)` and `(tabs)` route groups.

**Tech Stack additions vs Phase 0:** Supabase Auth (email magic link), Supabase Realtime (subscription on trip changes), Lucide icons, react-hook-form + zod for forms, expo-image for sprite previews.

**Reference spec:** `docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md` Sections 2, 3, 4.3, 5, 6.5, 6.7, 12.1.

**Reference plan:** `docs/superpowers/plans/2026-05-24-this-is-the-journey-phase-0-bootstrap.md` (completed).

---

## File Structure (created in this phase)

```
/src
  /app
    /(auth)
      _layout.tsx              # T9: auth stack layout
      sign-in.tsx              # T9: magic link sign-in
      check-email.tsx          # T9: post-link sent
    /(tabs)
      _layout.tsx              # T13: 5-tab bottom bar
      index.tsx                # T13: Home tab
      trips.tsx                # T14: My Trips list
      discover.tsx             # T13: Discover stub
      inbox.tsx                # T13: Inbox stub
      profile.tsx              # T13: Profile tab
    /(modals)
      create-trip.tsx          # T15: full-screen modal
      trip/[id].tsx            # T16: trip detail (placeholder for path UI)
      onboarding.tsx           # T10: profile creation flow
    _layout.tsx                # MODIFIED T2: add auth guard + router groups
  /core
    /supabase
      types.generated.ts       # T3: regenerated via MCP after migrations
  /shared
    /components
      /PixelButton             # T5
      /PixelCard               # T6
      /PixelInput              # T7
      /PixelChip               # T8
  /features
    /auth
      /api/auth.ts             # T9: signInWithMagicLink, signOut, getSession
      /hooks/useAuth.ts        # T9
      /hooks/useSession.ts     # T9
      /components/AuthGuard.tsx # T9
      /index.ts                # T9 public API
      /__tests__/auth.test.ts  # T9
    /profile
      /api/profile.ts          # T10: get/upsert profile
      /hooks/useProfile.ts     # T10
      /components/AvatarSpritePicker.tsx # T10
      /components/CountryPicker.tsx # T11
      /screens/OnboardingScreen.tsx # T10
      /index.ts
      /__tests__/profile.test.ts # T10
    /trips
      /api/trips.ts            # T15: CRUD + members
      /hooks/useTrips.ts       # T14
      /hooks/useTrip.ts        # T16
      /hooks/useTripMembers.ts # T17
      /components/TripCard.tsx # T14
      /components/InviteMemberForm.tsx # T17
      /screens/CreateTripScreen.tsx # T15
      /screens/TripDetailScreen.tsx # T16
      /index.ts
      /__tests__/trips.test.ts # T15
  /assets
    /sprites
      /avatars                 # T4: 12 starter avatar PNGs
        adventurer_1.png ... adventurer_12.png
```

DB migrations applied via Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`):

- T1: `01_profiles.sql` (profiles + extension to auth.users + RLS)
- T2: `02_trips.sql` (trips + trip_members + trip_invitations + RLS)
- T3 deferred to Phase 1.5: milestones, documents, photos, checklists, etc.

---

## Task 1: DB schema — profiles table + RLS

**Files:**
- Apply migration via Supabase MCP

- [ ] **Step 1: Apply profiles migration**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- name: `01_profiles`
- query:
```sql
-- Extension: profiles tied 1:1 to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_sprite_id text DEFAULT 'avatars/adventurer_1',
  avatar_color text DEFAULT '#E63946',
  bio text,
  passport_country text, -- ISO 3166-1 alpha-2
  passport_expires_at date,
  gender text, -- 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say'
  gender_visible_in_public boolean DEFAULT false,
  age_range text,
  show_age_in_public boolean DEFAULT false,
  countries_visited text[] DEFAULT ARRAY[]::text[],
  travel_style text[] DEFAULT ARRAY[]::text[],
  languages text[] DEFAULT ARRAY[]::text[],
  socials jsonb DEFAULT '{}'::jsonb,
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'friends_only', 'discoverable')),
  is_verified boolean DEFAULT false,
  verification_level int DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 3),
  reputation_score int DEFAULT 0,
  passport_stamps jsonb DEFAULT '[]'::jsonb,
  badges jsonb DEFAULT '[]'::jsonb,
  smart_reminders_enabled boolean DEFAULT true,
  reminder_categories_muted text[] DEFAULT ARRAY[]::text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_visibility ON public.profiles(visibility);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public can SELECT discoverable profiles (public fields only enforced via VIEW later)
CREATE POLICY "Profiles are viewable by everyone (limited fields)"
  ON public.profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 2: Verify with `list_tables`**

Use `mcp__plugin_supabase_supabase__list_tables` for schema public. Expect `profiles` listed with `rls_enabled: true`.

- [ ] **Step 3: Run advisors check**

Use `mcp__plugin_supabase_supabase__get_advisors` type=security. Expect no critical issues. Fix any if found.

- [ ] **Step 4: NO LOCAL FILES — purely DB. Commit comes after T3 (types generation).**

---

## Task 2: DB schema — trips + trip_members + trip_invitations + RLS

**Files:**
- Apply migration via Supabase MCP

- [ ] **Step 1: Apply trips migration**

Use `apply_migration` with name `02_trips`, query:
```sql
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  destination_country text,
  destination_countries text[] DEFAULT ARRAY[]::text[],
  world_theme text DEFAULT 'auto' CHECK (world_theme IN ('auto','generic','desert','forest','sakura','tropical','polar')),
  cover_image_url text,
  status text DEFAULT 'planning' CHECK (status IN ('planning','in_progress','completed','archived')),
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  visibility text DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public_view','open_to_join')),
  max_joiners int DEFAULT 1,
  current_joiners_count int DEFAULT 0,
  open_to_genders text[] DEFAULT ARRAY['woman','man','non_binary']::text[],
  open_age_min int,
  open_age_max int,
  open_vibes text[],
  open_budget_level text,
  open_languages text[],
  joiner_note text,
  joinable_segments jsonb DEFAULT '[]'::jsonb,
  requires_verified_joiners boolean DEFAULT false,
  is_women_only boolean GENERATED ALWAYS AS (open_to_genders = ARRAY['woman']::text[]) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (open_age_min IS NULL OR open_age_min >= 18)
);

CREATE INDEX idx_trips_owner ON public.trips(owner_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_visibility ON public.trips(visibility);
CREATE INDEX idx_trips_dates ON public.trips(start_date, end_date);

CREATE TABLE IF NOT EXISTS public.trip_members (
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  location_sharing text DEFAULT 'precise' CHECK (location_sharing IN ('precise','city_only','paused','never')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE INDEX idx_trip_members_user ON public.trip_members(user_id);

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  email text,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invitations_token ON public.trip_invitations(token);
CREATE INDEX idx_invitations_trip ON public.trip_invitations(trip_id);

-- updated_at triggers
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-add owner as a member on trip creation
CREATE OR REPLACE FUNCTION public.handle_new_trip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_trip_created ON public.trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip();

-- RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of trip?
CREATE OR REPLACE FUNCTION public.is_trip_member(trip uuid, uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip AND user_id = uid);
$$;

CREATE OR REPLACE FUNCTION public.is_trip_editor(trip uuid, uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip AND user_id = uid AND role IN ('owner','editor'));
$$;

-- trips policies
CREATE POLICY "Members can SELECT their trips"
  ON public.trips FOR SELECT USING (
    auth.uid() = owner_id OR public.is_trip_member(id, auth.uid())
    OR visibility IN ('unlisted','public_view','open_to_join')
  );

CREATE POLICY "Authenticated users can INSERT trips they own"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Editors can UPDATE trip"
  ON public.trips FOR UPDATE USING (public.is_trip_editor(id, auth.uid()));

CREATE POLICY "Owner can DELETE trip"
  ON public.trips FOR DELETE USING (auth.uid() = owner_id);

-- trip_members policies
CREATE POLICY "Members can SELECT trip_members for their trips"
  ON public.trip_members FOR SELECT USING (
    public.is_trip_member(trip_id, auth.uid())
  );

CREATE POLICY "Owner can INSERT trip_members (via invitation accept)"
  ON public.trip_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND owner_id = auth.uid())
    OR user_id = auth.uid() -- self-add via invitation accept flow
  );

CREATE POLICY "Members can UPDATE own membership (location_sharing)"
  ON public.trip_members FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Owner can DELETE members; users can leave"
  ON public.trip_members FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND owner_id = auth.uid())
  );

-- trip_invitations policies
CREATE POLICY "Editors can manage invitations for their trips"
  ON public.trip_invitations FOR ALL USING (
    public.is_trip_editor(trip_id, auth.uid())
  );

CREATE POLICY "Anyone authenticated can SELECT an invitation by token (handled in app layer)"
  ON public.trip_invitations FOR SELECT USING (true);
```

- [ ] **Step 2: Verify with `list_tables`** — expect 3 tables: trips, trip_members, trip_invitations all with RLS.

- [ ] **Step 3: Run `get_advisors` type=security** — fix any flagged issues inline (e.g. missing RLS).

---

## Task 3: Generate TypeScript types from Supabase + commit

**Files:**
- Modify: `src/core/supabase/types.ts` (replace placeholder with generated content)
- Modify: `package.json` (verify script `supabase:types`)

- [ ] **Step 1: Generate types via MCP**

Use `mcp__plugin_supabase_supabase__generate_typescript_types` (no args, uses authenticated project = ewsoupkfkachxidmuwoi).

- [ ] **Step 2: Save output to `src/core/supabase/types.ts`**

Replace the file content with the generated types. Example output starts with:
```typescript
export type Json = ...
export interface Database { public: { Tables: { profiles: ..., trips: ..., trip_members: ..., trip_invitations: ... }, ... } }
```

- [ ] **Step 3: Run typecheck**
```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit Tasks 1-3**
```bash
git add src/core/supabase/types.ts docs/superpowers/plans/2026-05-25-this-is-the-journey-phase-1-auth-trips-foundation.md
git commit -m "feat(db): Phase 1 schema - profiles + trips + members + invitations + RLS + generated types"
```

- [ ] **Step 5: Invoke code-validator agent** to verify the generated types compile cleanly with existing code.

---

## Task 4: Avatar sprite assets (12 starter sprites)

**Files:**
- Create: `src/assets/sprites/avatars/adventurer_1.png` … `adventurer_12.png`
- Create: `src/assets/sprites/avatars/manifest.ts` (TS export of paths)

- [ ] **Step 1: Create directory + manifest**

```bash
mkdir -p src/assets/sprites/avatars
```

Create `src/assets/sprites/avatars/manifest.ts`:
```typescript
export const AVATAR_SPRITES = [
  { id: 'avatars/adventurer_1', source: require('./adventurer_1.png'), label: 'Adventurer Red' },
  { id: 'avatars/adventurer_2', source: require('./adventurer_2.png'), label: 'Adventurer Blue' },
  { id: 'avatars/adventurer_3', source: require('./adventurer_3.png'), label: 'Adventurer Green' },
  { id: 'avatars/adventurer_4', source: require('./adventurer_4.png'), label: 'Adventurer Yellow' },
  { id: 'avatars/adventurer_5', source: require('./adventurer_5.png'), label: 'Adventurer Purple' },
  { id: 'avatars/adventurer_6', source: require('./adventurer_6.png'), label: 'Adventurer Pink' },
  { id: 'avatars/adventurer_7', source: require('./adventurer_7.png'), label: 'Adventurer Orange' },
  { id: 'avatars/adventurer_8', source: require('./adventurer_8.png'), label: 'Adventurer Cyan' },
  { id: 'avatars/adventurer_9', source: require('./adventurer_9.png'), label: 'Adventurer Black' },
  { id: 'avatars/adventurer_10', source: require('./adventurer_10.png'), label: 'Adventurer White' },
  { id: 'avatars/adventurer_11', source: require('./adventurer_11.png'), label: 'Adventurer Gold' },
  { id: 'avatars/adventurer_12', source: require('./adventurer_12.png'), label: 'Adventurer Silver' },
] as const;

export type AvatarSpriteId = (typeof AVATAR_SPRITES)[number]['id'];
```

- [ ] **Step 2: Download 12 placeholder sprites**

For now, generate 12 colored placeholder PNGs (64x64) via placehold.co. In Bash:
```bash
COLORS=("E63946" "6BBFE2" "2A9D8F" "FFCB05" "5B3B7F" "FF4592" "FF7A4A" "5FCFE6" "0F1A2E" "FFFFFF" "FFD700" "C0C0C0")
LABELS=("RED" "BLU" "GRN" "YEL" "PUR" "PNK" "ORG" "CYN" "BLK" "WHT" "GLD" "SLV")
for i in $(seq 0 11); do
  n=$((i+1))
  curl -sL "https://placehold.co/64x64/${COLORS[$i]}/${COLORS[$((i^9))]}.png?text=${LABELS[$i]}" -o "src/assets/sprites/avatars/adventurer_${n}.png"
done
ls -la src/assets/sprites/avatars/
```

Should produce 12 PNG files. These are placeholders to swap with real Kenney sprites later.

- [ ] **Step 3: Commit**
```bash
git add src/assets/sprites/
git commit -m "feat(assets): 12 starter avatar sprite placeholders + manifest"
```

---

## Task 5: PixelButton component + tests

**Files:**
- Create: `src/shared/components/PixelButton/PixelButton.tsx`
- Create: `src/shared/components/PixelButton/index.ts`
- Create: `src/shared/components/PixelButton/PixelButton.test.tsx`

- [ ] **Step 1: Implement PixelButton**

Create `src/shared/components/PixelButton/PixelButton.tsx`:
```typescript
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, View } from 'react-native';

import { cn } from '@shared/utils/cn';

import { PixelText } from '../PixelText';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface PixelButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary-600', text: 'text-white', border: 'border-border' },
  secondary: { bg: 'bg-secondary-700', text: 'text-white', border: 'border-border' },
  accent: { bg: 'bg-accent-500', text: 'text-accent-700', border: 'border-border' },
  ghost: { bg: 'bg-transparent', text: 'text-text-primary', border: 'border-border' },
  danger: { bg: 'bg-error', text: 'text-white', border: 'border-border' },
};

const sizeClasses: Record<Size, { padX: string; padY: string; minH: string }> = {
  sm: { padX: 'px-3', padY: 'py-2', minH: 'min-h-[36px]' },
  md: { padX: 'px-5', padY: 'py-3', minH: 'min-h-[48px]' },
  lg: { padX: 'px-6', padY: 'py-4', minH: 'min-h-[56px]' },
};

export const PixelButton = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  className,
  disabled,
  accessibilityLabel,
  ...rest
}: PixelButtonProps) => {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={accessibilityLabel}
      disabled={!isInteractive}
      {...rest}
    >
      {({ pressed }) => (
        <View
          className={cn(
            v.bg,
            v.border,
            s.padX,
            s.padY,
            s.minH,
            'flex-row items-center justify-center gap-2 rounded border-pixel',
            fullWidth && 'w-full',
            !isInteractive && 'opacity-40',
            pressed && isInteractive && 'translate-x-[2px] translate-y-[2px]',
            className,
          )}
          style={{
            shadowColor: '#0F1A2E',
            shadowOffset: { width: pressed && isInteractive ? 2 : 4, height: pressed && isInteractive ? 2 : 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          }}
        >
          {loading ? (
            <ActivityIndicator color={variant === 'accent' || variant === 'ghost' ? '#0F1A2E' : '#FFF'} />
          ) : (
            <>
              {leftIcon}
              <PixelText size="body" family="heading" className={v.text}>
                {children}
              </PixelText>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
};
```

- [ ] **Step 2: Create index.ts**
```typescript
export { PixelButton } from './PixelButton';
export type { PixelButtonProps } from './PixelButton';
```

- [ ] **Step 3: Write tests**

Create `src/shared/components/PixelButton/PixelButton.test.tsx`:
```typescript
import { fireEvent, render } from '@testing-library/react-native';

import { PixelButton } from './PixelButton';

describe('PixelButton', () => {
  it('renders label', () => {
    const { getByText } = render(<PixelButton>Tap me</PixelButton>);
    expect(getByText('Tap me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PixelButton onPress={onPress}>Press</PixelButton>);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PixelButton onPress={onPress} disabled>Press</PixelButton>);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PixelButton onPress={onPress} loading>Press</PixelButton>);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sets busy accessibilityState when loading', () => {
    const { getByRole } = render(<PixelButton loading>Loading</PixelButton>);
    const btn = getByRole('button');
    expect(btn.props.accessibilityState).toMatchObject({ busy: true });
  });
});
```

- [ ] **Step 4: Run tests + invoke code-validator**

```bash
npm test -- src/shared/components/PixelButton
```

Then dispatch code-validator agent.

- [ ] **Step 5: Commit**
```bash
git add src/shared/components/PixelButton/
git commit -m "feat(ds): PixelButton component with 5 variants + tests"
```

---

## Task 6: PixelCard component + tests

**Files:**
- Create: `src/shared/components/PixelCard/PixelCard.tsx`
- Create: `src/shared/components/PixelCard/index.ts`
- Create: `src/shared/components/PixelCard/PixelCard.test.tsx`

- [ ] **Step 1: Implement PixelCard**

```typescript
import { ReactNode } from 'react';
import { Pressable, View, ViewProps } from 'react-native';

import { cn } from '@shared/utils/cn';

export interface PixelCardProps extends Omit<ViewProps, 'children' | 'style'> {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const PixelCard = ({
  children,
  onPress,
  variant = 'default',
  padding = 'md',
  className,
  accessibilityLabel,
  ...rest
}: PixelCardProps) => {
  const cardClasses = cn(
    'bg-surface rounded-md border-pixel border-border',
    paddingClasses[padding],
    className,
  );

  const shadow =
    variant === 'flat'
      ? { shadowOpacity: 0 }
      : variant === 'elevated'
        ? { shadowColor: '#0F1A2E', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }
        : { shadowColor: '#0F1A2E', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 };

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        {({ pressed }) => (
          <View
            className={cn(cardClasses, pressed && 'translate-x-[2px] translate-y-[2px]')}
            style={pressed ? { ...shadow, shadowOffset: { width: 2, height: 2 } } : shadow}
          >
            {children}
          </View>
        )}
      </Pressable>
    );
  }
  return (
    <View className={cardClasses} style={shadow} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
};
```

- [ ] **Step 2: index.ts + tests + commit (same pattern as T5)**

Tests verify: renders children, calls onPress, renders without onPress as plain View.

```bash
git commit -m "feat(ds): PixelCard component (default/elevated/flat) + tests"
```

- [ ] **Step 3: Code-validator after.**

---

## Task 7: PixelInput component + tests

**Files:**
- Create: `src/shared/components/PixelInput/PixelInput.tsx`
- Create: `src/shared/components/PixelInput/index.ts`
- Create: `src/shared/components/PixelInput/PixelInput.test.tsx`

- [ ] **Step 1: Implement PixelInput**

```typescript
import { forwardRef } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import { cn } from '@shared/utils/cn';

import { PixelText } from '../PixelText';

export interface PixelInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  containerClassName?: string;
}

export const PixelInput = forwardRef<TextInput, PixelInputProps>(
  ({ label, helperText, errorText, required, containerClassName, ...inputProps }, ref) => {
    const hasError = Boolean(errorText);
    return (
      <View className={cn('w-full', containerClassName)}>
        {label && (
          <PixelText size="small" family="body-medium" className="mb-1 text-text-primary">
            {label} {required && <PixelText className="text-error">*</PixelText>}
          </PixelText>
        )}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? inputProps.accessibilityLabel}
          accessibilityState={{ disabled: inputProps.editable === false }}
          placeholderTextColor="#A8B0BD"
          className={cn(
            'min-h-[48px] rounded border-pixel bg-surface px-3 py-2 text-body font-body text-text-primary',
            hasError ? 'border-error' : 'border-border',
            inputProps.editable === false && 'opacity-50',
          )}
          {...inputProps}
        />
        {hasError ? (
          <PixelText size="caption" className="mt-1 text-error">
            {errorText}
          </PixelText>
        ) : helperText ? (
          <PixelText size="caption" className="mt-1 text-text-secondary">
            {helperText}
          </PixelText>
        ) : null}
      </View>
    );
  },
);

PixelInput.displayName = 'PixelInput';
```

- [ ] **Step 2: index.ts**
```typescript
export { PixelInput } from './PixelInput';
export type { PixelInputProps } from './PixelInput';
```

- [ ] **Step 3: Write tests**

```typescript
import { fireEvent, render } from '@testing-library/react-native';

import { PixelInput } from './PixelInput';

describe('PixelInput', () => {
  it('renders label', () => {
    const { getByText } = render(<PixelInput label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders required asterisk', () => {
    const { getByText } = render(<PixelInput label="Email" required />);
    expect(getByText('*')).toBeTruthy();
  });

  it('shows error text when provided', () => {
    const { getByText } = render(<PixelInput label="Email" errorText="Invalid" />);
    expect(getByText('Invalid')).toBeTruthy();
  });

  it('calls onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(<PixelInput label="Email" onChangeText={onChangeText} />);
    fireEvent.changeText(getByLabelText('Email'), 'foo@bar.com');
    expect(onChangeText).toHaveBeenCalledWith('foo@bar.com');
  });
});
```

- [ ] **Step 4: Run + code-validator + commit**

```bash
git commit -m "feat(ds): PixelInput component with label/helper/error + tests"
```

---

## Task 8: PixelChip component + tests

**Files:**
- Create: `src/shared/components/PixelChip/PixelChip.tsx`
- Create: `src/shared/components/PixelChip/index.ts`
- Create: `src/shared/components/PixelChip/PixelChip.test.tsx`

- [ ] **Step 1: Implement PixelChip**

```typescript
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@shared/utils/cn';

import { PixelText } from '../PixelText';

export interface PixelChipProps {
  label: string;
  selected?: boolean;
  variant?: 'default' | 'accent';
  leftIcon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

export const PixelChip = ({
  label,
  selected = false,
  variant = 'default',
  leftIcon,
  onPress,
  disabled = false,
  className,
  accessibilityLabel,
}: PixelChipProps) => {
  const bgClass = selected
    ? variant === 'accent'
      ? 'bg-accent-500'
      : 'bg-primary-600'
    : 'bg-surface-alt';
  const textClass = selected
    ? variant === 'accent'
      ? 'text-accent-700'
      : 'text-white'
    : 'text-text-primary';

  const content = (
    <View
      className={cn(
        bgClass,
        'flex-row items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5',
        disabled && 'opacity-40',
        className,
      )}
    >
      {leftIcon}
      <PixelText size="small" family="body-medium" className={textClass}>
        {label}
      </PixelText>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
    >
      {content}
    </Pressable>
  );
};
```

- [ ] **Step 2-4: index.ts + tests + commit + code-validator**

Tests: renders label, selected state changes bg, calls onPress, hitSlop applied.

```bash
git commit -m "feat(ds): PixelChip component (multi-select friendly) + tests"
```

---

## Task 9: Auth feature module (magic link sign-in)

**Files:**
- Create: `src/features/auth/api/auth.ts`
- Create: `src/features/auth/hooks/useSession.ts`
- Create: `src/features/auth/hooks/useAuth.ts`
- Create: `src/features/auth/components/AuthGuard.tsx`
- Create: `src/features/auth/index.ts`
- Create: `src/app/(auth)/_layout.tsx`
- Create: `src/app/(auth)/sign-in.tsx`
- Create: `src/app/(auth)/check-email.tsx`
- Create: `src/features/auth/__tests__/auth.test.ts`
- Add i18n keys to `src/core/i18n/locales/{en,fr}.json` for auth namespace

- [ ] **Step 1: Add i18n keys**

Edit `src/core/i18n/locales/en.json` to add (alongside existing keys):
```json
{
  "auth": {
    "signIn": {
      "title": "Welcome back, adventurer!",
      "subtitle": "Enter your email and we'll send you a magic link.",
      "emailLabel": "Email",
      "emailPlaceholder": "you@example.com",
      "sendLinkButton": "Send me a magic link",
      "emailRequired": "Email is required",
      "emailInvalid": "Please enter a valid email"
    },
    "checkEmail": {
      "title": "Check your inbox",
      "subtitle": "We sent a magic link to {{email}}. Tap it from your phone to sign in.",
      "resend": "Resend link",
      "back": "Back to sign in"
    },
    "signOut": "Sign out"
  }
}
```

And in `fr.json`:
```json
{
  "auth": {
    "signIn": {
      "title": "Bon retour, aventurier·e !",
      "subtitle": "Entre ton email, on t'envoie un lien magique.",
      "emailLabel": "Email",
      "emailPlaceholder": "toi@example.com",
      "sendLinkButton": "Envoie-moi un lien magique",
      "emailRequired": "L'email est requis",
      "emailInvalid": "Email invalide"
    },
    "checkEmail": {
      "title": "Vérifie ta boîte mail",
      "subtitle": "On a envoyé un lien magique à {{email}}. Tape dessus depuis ton téléphone.",
      "resend": "Renvoyer le lien",
      "back": "Retour à la connexion"
    },
    "signOut": "Se déconnecter"
  }
}
```

- [ ] **Step 2: Implement auth/api/auth.ts**

```typescript
import { supabase } from '@core/supabase/client';

const REDIRECT_SCHEME = 'thisisthejourney://auth/callback';

export async function signInWithMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_SCHEME },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
```

- [ ] **Step 3: Implement useSession hook**

`src/features/auth/hooks/useSession.ts`:
```typescript
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@core/supabase/client';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

- [ ] **Step 4: Implement useAuth hook**

`src/features/auth/hooks/useAuth.ts`:
```typescript
import { useState } from 'react';

import { signInWithMagicLink, signOut } from '../api/auth';

export function useAuth() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMagicLink = async (email: string) => {
    setPending(true);
    setError(null);
    try {
      await signInWithMagicLink(email);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      setPending(false);
    }
  };

  const logOut = async () => {
    setPending(true);
    try {
      await signOut();
    } finally {
      setPending(false);
    }
  };

  return { sendMagicLink, logOut, pending, error };
}
```

- [ ] **Step 5: Implement AuthGuard component**

`src/features/auth/components/AuthGuard.tsx`:
```typescript
import { Redirect } from 'expo-router';
import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '../hooks/useSession';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#E63946" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <>{children}</>;
}
```

- [ ] **Step 6: Public API src/features/auth/index.ts**
```typescript
export { useAuth } from './hooks/useAuth';
export { useSession } from './hooks/useSession';
export { AuthGuard } from './components/AuthGuard';
export { signInWithMagicLink, signOut, getCurrentSession } from './api/auth';
```

- [ ] **Step 7: Auth screens**

`src/app/(auth)/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF8EC' } }} />;
}
```

`src/app/(auth)/sign-in.tsx`:
```typescript
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useTranslation } from '@core/i18n';
import { useAuth } from '@features/auth';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

const emailSchema = z.string().email();

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendMagicLink, pending, error } = useAuth();
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setValidationError(t('auth.signIn.emailInvalid'));
      return;
    }
    setValidationError(undefined);
    try {
      await sendMagicLink(email);
      router.push({ pathname: '/(auth)/check-email', params: { email } });
    } catch {
      /* error rendered via `error` from useAuth */
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-cream"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 justify-center px-6">
        <PixelText size="display-lg" family="pixel" className="mb-4 text-center text-primary-600">
          THIS IS THE{'\n'}JOURNEY
        </PixelText>
        <PixelText size="h3" className="mb-2 text-center">
          {t('auth.signIn.title')}
        </PixelText>
        <PixelText size="body" className="mb-6 text-center text-text-secondary">
          {t('auth.signIn.subtitle')}
        </PixelText>

        <PixelInput
          label={t('auth.signIn.emailLabel')}
          placeholder={t('auth.signIn.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          required
          errorText={validationError ?? error?.message}
          containerClassName="mb-4"
        />

        <PixelButton onPress={handleSubmit} loading={pending} fullWidth>
          {t('auth.signIn.sendLinkButton')}
        </PixelButton>
      </View>
    </KeyboardAvoidingView>
  );
}
```

`src/app/(auth)/check-email.tsx`:
```typescript
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useAuth } from '@features/auth';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const { sendMagicLink, pending } = useAuth();

  return (
    <View className="flex-1 justify-center bg-cream px-6" style={{ paddingTop: insets.top }}>
      <PixelText size="display-lg" family="pixel" className="mb-4 text-center text-primary-600">
        📬
      </PixelText>
      <PixelText size="h2" className="mb-2 text-center">
        {t('auth.checkEmail.title')}
      </PixelText>
      <PixelText size="body" className="mb-8 text-center text-text-secondary">
        {t('auth.checkEmail.subtitle', { email })}
      </PixelText>
      <PixelButton
        variant="ghost"
        loading={pending}
        onPress={() => email && void sendMagicLink(email)}
        fullWidth
        className="mb-3"
      >
        {t('auth.checkEmail.resend')}
      </PixelButton>
      <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
        {t('auth.checkEmail.back')}
      </PixelButton>
    </View>
  );
}
```

- [ ] **Step 8: Tests**

`src/features/auth/__tests__/auth.test.ts`:
```typescript
jest.mock('@core/env', () => ({
  env: { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'sb_publishable_test' },
}));

import { signInWithMagicLink } from '../api/auth';
import { supabase } from '@core/supabase/client';

jest.spyOn(supabase.auth, 'signInWithOtp').mockResolvedValue({ data: { user: null, session: null }, error: null } as never);

describe('auth.api', () => {
  it('signInWithMagicLink calls supabase OTP with redirect', async () => {
    await signInWithMagicLink('test@example.com');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { emailRedirectTo: 'thisisthejourney://auth/callback' },
    });
  });
});
```

- [ ] **Step 9: Run tests + code-validator + commit**

```bash
git add src/features/auth src/app/\(auth\) src/core/i18n/locales/
git commit -m "feat(auth): magic link sign-in flow + AuthGuard + i18n + tests"
```

Configure Supabase Auth deep link `thisisthejourney://auth/callback` via Supabase MCP `execute_sql` updating auth.config OR via the Supabase Dashboard (manual one-time setup; document in CLAUDE.md if dashboard required).

---

## Task 10: Profile feature module + onboarding screen

**Files:**
- Create: `src/features/profile/api/profile.ts`
- Create: `src/features/profile/hooks/useProfile.ts`
- Create: `src/features/profile/components/AvatarSpritePicker.tsx`
- Create: `src/features/profile/screens/OnboardingScreen.tsx`
- Create: `src/features/profile/index.ts`
- Create: `src/features/profile/__tests__/profile.test.ts`
- Create: `src/app/(modals)/onboarding.tsx`
- Add i18n keys for profile namespace.

- [ ] **Step 1: Add i18n keys**

`en.json` add:
```json
{
  "profile": {
    "onboarding": {
      "title": "Welcome aboard, adventurer!",
      "subtitle": "Set up your traveler profile.",
      "displayNameLabel": "Display name",
      "avatarLabel": "Pick your sprite",
      "passportLabel": "Passport country (optional, helps with smart reminders)",
      "passportHelper": "We'll use this to tell you about visas, ESTAs, etc.",
      "saveButton": "Start exploring",
      "skipButton": "Skip for now"
    }
  }
}
```

`fr.json` translate accordingly.

- [ ] **Step 2: api/profile.ts**

```typescript
import { supabase } from '@core/supabase/client';

import type { Database } from '@core/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function getMyProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(updates: ProfileUpdate): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userData.user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: useProfile hook (TanStack Query)**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMyProfile, updateMyProfile, type ProfileUpdate } from '../api/profile';

const QUERY_KEY = ['my-profile'] as const;

export function useProfile() {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: getMyProfile });
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (updates: ProfileUpdate) => updateMyProfile(updates),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
  return { ...query, updateProfile: mutation.mutateAsync, isUpdating: mutation.isPending };
}
```

Wrap app in QueryClientProvider — modify `src/app/_layout.tsx` accordingly (next step).

- [ ] **Step 4: Wrap app with QueryClientProvider**

Edit `src/app/_layout.tsx` to add:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// inside component, top-level:
const queryClient = new QueryClient();
// wrap return with <QueryClientProvider client={queryClient}>...</QueryClientProvider>
```

- [ ] **Step 5: AvatarSpritePicker component**

```typescript
import { Image } from 'expo-image';
import { FlatList, View } from 'react-native';

import { AVATAR_SPRITES } from '@assets/sprites/avatars/manifest';
import { PixelCard } from '@shared/components/PixelCard';

export interface AvatarSpritePickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function AvatarSpritePicker({ value, onChange }: AvatarSpritePickerProps) {
  return (
    <FlatList
      data={AVATAR_SPRITES}
      numColumns={4}
      contentContainerStyle={{ gap: 8 }}
      columnWrapperStyle={{ gap: 8 }}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PixelCard
          onPress={() => onChange(item.id)}
          variant={value === item.id ? 'elevated' : 'flat'}
          padding="sm"
          accessibilityLabel={item.label}
          className={value === item.id ? 'border-primary-600' : ''}
        >
          <View className="h-14 w-14 items-center justify-center">
            <Image source={item.source} style={{ width: 48, height: 48 }} contentFit="contain" />
          </View>
        </PixelCard>
      )}
    />
  );
}
```

- [ ] **Step 6: OnboardingScreen + (modals)/onboarding.tsx**

`src/features/profile/screens/OnboardingScreen.tsx`:
```typescript
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { AvatarSpritePicker } from '../components/AvatarSpritePicker';
import { useProfile } from '../hooks/useProfile';

export function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile, updateProfile, isUpdating } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [spriteId, setSpriteId] = useState(profile?.avatar_sprite_id ?? 'avatars/adventurer_1');
  const [passportCountry, setPassportCountry] = useState(profile?.passport_country ?? '');

  const handleSave = async () => {
    await updateProfile({
      display_name: displayName || null,
      avatar_sprite_id: spriteId,
      passport_country: passportCountry || null,
    });
    router.replace('/(tabs)');
  };

  const handleSkip = () => router.replace('/(tabs)');

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
    >
      <PixelText size="h1" className="mb-2">{t('profile.onboarding.title')}</PixelText>
      <PixelText size="body" className="mb-6 text-text-secondary">{t('profile.onboarding.subtitle')}</PixelText>

      <PixelInput
        label={t('profile.onboarding.displayNameLabel')}
        value={displayName}
        onChangeText={setDisplayName}
        containerClassName="mb-4"
      />

      <PixelText size="small" className="mb-2 text-text-primary">{t('profile.onboarding.avatarLabel')}</PixelText>
      <View className="mb-4 h-72">
        <AvatarSpritePicker value={spriteId} onChange={setSpriteId} />
      </View>

      <PixelInput
        label={t('profile.onboarding.passportLabel')}
        helperText={t('profile.onboarding.passportHelper')}
        value={passportCountry}
        onChangeText={(v) => setPassportCountry(v.toUpperCase().slice(0, 2))}
        autoCapitalize="characters"
        maxLength={2}
        placeholder="FR"
        containerClassName="mb-6"
      />

      <PixelButton onPress={handleSave} loading={isUpdating} fullWidth className="mb-3">
        {t('profile.onboarding.saveButton')}
      </PixelButton>
      <PixelButton variant="ghost" onPress={handleSkip} fullWidth>
        {t('profile.onboarding.skipButton')}
      </PixelButton>
    </ScrollView>
  );
}
```

`src/app/(modals)/onboarding.tsx`:
```typescript
import { OnboardingScreen } from '@features/profile/screens/OnboardingScreen';

export default OnboardingScreen;
```

- [ ] **Step 7: profile/index.ts + tests + commit + code-validator**

```bash
git commit -m "feat(profile): onboarding screen with sprite picker + passport country + tests"
```

---

## Task 11: Country picker component (lightweight ISO 3166 list)

**Files:**
- Create: `src/features/profile/components/CountryPicker.tsx`
- Create: `src/features/profile/data/countries.ts` (top 200 ISO codes + name + flag emoji)
- Optional tests

For brevity, ship a curated list of ~50 most-traveled countries (US, FR, JP, CA, etc.) as a select-style picker. Bottom-sheet UI.

- [ ] **Step 1: Create countries.ts**

```typescript
export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string; // emoji
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
];

export const findCountry = (code: string): Country | undefined =>
  COUNTRIES.find((c) => c.code === code.toUpperCase());
```

- [ ] **Step 2: CountryPicker component** (use simple FlatList in modal sheet; replace the freeform TextInput in OnboardingScreen with this).

```typescript
import { useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { COUNTRIES, type Country, findCountry } from '../data/countries';

export interface CountryPickerProps {
  value: string | null;
  onChange: (code: string) => void;
  label?: string;
  helperText?: string;
}

export function CountryPicker({ value, onChange, label, helperText }: CountryPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = value ? findCountry(value) : undefined;
  const filtered = search
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search.toUpperCase()))
    : COUNTRIES;

  return (
    <View>
      {label && (
        <PixelText size="small" family="body-medium" className="mb-1 text-text-primary">
          {label}
        </PixelText>
      )}
      <PixelCard onPress={() => setOpen(true)} variant="default" padding="md">
        <PixelText size="body" className={selected ? 'text-text-primary' : 'text-text-disabled'}>
          {selected ? `${selected.flag}  ${selected.name}` : 'Tap to pick'}
        </PixelText>
      </PixelCard>
      {helperText && (
        <PixelText size="caption" className="mt-1 text-text-secondary">
          {helperText}
        </PixelText>
      )}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-cream p-4">
          <TextInput
            placeholder="Search…"
            value={search}
            onChangeText={setSearch}
            autoFocus
            className="mb-3 min-h-[48px] rounded border-pixel border-border bg-surface px-3 py-2 text-body"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }: { item: Country }) => (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                  setSearch('');
                }}
                className="mb-1 flex-row items-center gap-3 rounded border-pixel border-border bg-surface px-3 py-3"
              >
                <PixelText size="lead">{item.flag}</PixelText>
                <PixelText size="body" className="flex-1">{item.name}</PixelText>
                <PixelText size="caption" className="text-text-secondary">{item.code}</PixelText>
              </Pressable>
            )}
          />
          <PixelButton variant="ghost" onPress={() => setOpen(false)} fullWidth className="mt-3">
            {t('common.cancel')}
          </PixelButton>
        </View>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 3: Use CountryPicker in OnboardingScreen** (replace the TextInput for `passportCountry`).

- [ ] **Step 4: Commit + code-validator**
```bash
git commit -m "feat(profile): country picker (~50 most-traveled countries) + integrate in onboarding"
```

---

## Task 12: Auth deep link + root layout AuthGuard integration

**Files:**
- Modify: `src/app/_layout.tsx` — add `<AuthGuard>` for `(tabs)` routes, also Supabase deeplink listener

- [ ] **Step 1: Read existing src/app/_layout.tsx** then modify to wrap routes with QueryClientProvider + handle Supabase auth deep links.

```typescript
// Add to imports
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@core/supabase/client';

// Inside RootLayout, after font/init effects:
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 } } });

useEffect(() => {
  const sub = Linking.addEventListener('url', ({ url }) => {
    // Parse supabase auth callback
    if (url.includes('auth/callback')) {
      const { params } = Linking.parse(url);
      if (params?.access_token && params?.refresh_token) {
        void supabase.auth.setSession({
          access_token: params.access_token as string,
          refresh_token: params.refresh_token as string,
        });
      }
    }
  });
  // Also handle initial URL
  void Linking.getInitialURL().then((url) => {
    if (!url) return;
    if (url.includes('auth/callback')) {
      const { params } = Linking.parse(url);
      if (params?.access_token && params?.refresh_token) {
        void supabase.auth.setSession({
          access_token: params.access_token as string,
          refresh_token: params.refresh_token as string,
        });
      }
    }
  });
  return () => sub.remove();
}, []);

// Wrap return:
<QueryClientProvider client={queryClient}>
  <SafeAreaProvider>...</SafeAreaProvider>
</QueryClientProvider>
```

- [ ] **Step 2: Commit + code-validator**
```bash
git commit -m "feat(auth): deep link handler + QueryClientProvider in root layout"
```

---

## Task 13: Bottom tab bar shell (5 tabs)

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/index.tsx` (Home)
- Create: `src/app/(tabs)/discover.tsx` (stub)
- Create: `src/app/(tabs)/inbox.tsx` (stub)
- Create: `src/app/(tabs)/profile.tsx` (Profile root)

- [ ] **Step 1: Tabs layout**

```typescript
import { Tabs } from 'expo-router';
import { Compass, Home, Inbox as InboxIcon, Map, User } from 'lucide-react-native';

import { useTranslation } from '@core/i18n';
import { AuthGuard } from '@features/auth';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#C62A38',
          tabBarInactiveTintColor: '#5E6779',
          tabBarStyle: {
            backgroundColor: '#FFF',
            borderTopWidth: 3,
            borderTopColor: '#0F1A2E',
            height: 64,
          },
          tabBarLabelStyle: { fontFamily: 'Fredoka_500Medium', fontSize: 10 },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
        <Tabs.Screen name="trips" options={{ title: t('tabs.trips'), tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }} />
        <Tabs.Screen name="discover" options={{ title: t('tabs.discover'), tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
        <Tabs.Screen name="inbox" options={{ title: t('tabs.inbox'), tabBarIcon: ({ color, size }) => <InboxIcon color={color} size={size} /> }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      </Tabs>
    </AuthGuard>
  );
}
```

Add to en.json/fr.json:
```json
"tabs": {
  "home": "Home",
  "trips": "Trips",
  "discover": "Discover",
  "inbox": "Inbox",
  "profile": "Profile"
}
```
(FR: Accueil / Voyages / Explorer / Boîte / Profil)

- [ ] **Step 2: Stub screens** — index (Home), discover, inbox, profile each render a simple welcome with PixelText. Profile shows sign-out button:

`src/app/(tabs)/profile.tsx`:
```typescript
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useAuth } from '@features/auth';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

export default function ProfileTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { logOut, pending } = useAuth();
  return (
    <View className="flex-1 bg-cream px-6" style={{ paddingTop: insets.top + 24 }}>
      <PixelText size="h1" className="mb-6">{t('tabs.profile')}</PixelText>
      <PixelButton variant="danger" onPress={logOut} loading={pending}>{t('auth.signOut')}</PixelButton>
    </View>
  );
}
```

Stubs for discover, inbox, index: render screen title + "Coming soon".

- [ ] **Step 3: Commit + code-validator**
```bash
git commit -m "feat(tabs): 5-tab bottom bar with AuthGuard + stub screens"
```

---

## Task 14: My Trips tab (list trips)

**Files:**
- Create: `src/app/(tabs)/trips.tsx`
- Create: `src/features/trips/api/trips.ts`
- Create: `src/features/trips/hooks/useTrips.ts`
- Create: `src/features/trips/components/TripCard.tsx`
- Create: `src/features/trips/index.ts`
- Create: `src/features/trips/__tests__/trips.test.ts`
- Add i18n trips namespace.

- [ ] **Step 1: i18n keys**

```json
"trips": {
  "list": {
    "title": "My Trips",
    "empty": {
      "title": "Your adventures await",
      "subtitle": "Plan your first trip — tap the + button",
      "cta": "Create my first trip"
    }
  },
  "create": {
    "title": "New Adventure",
    "nameLabel": "Trip name",
    "namePlaceholder": "USA West Coast 2026",
    "startDateLabel": "Start date",
    "endDateLabel": "End date",
    "destinationLabel": "Destination country",
    "createButton": "Create trip"
  }
}
```

- [ ] **Step 2: trips/api/trips.ts**

```typescript
import { supabase } from '@core/supabase/client';

import type { Database } from '@core/supabase/types';

export type Trip = Database['public']['Tables']['trips']['Row'];
export type TripInsert = Database['public']['Tables']['trips']['Insert'];
export type TripUpdate = Database['public']['Tables']['trips']['Update'];

export async function listMyTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTrip(input: TripInsert): Promise<Trip> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...input, owner_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrip(id: string, updates: TripUpdate): Promise<Trip> {
  const { data, error } = await supabase.from('trips').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: useTrips hook**

```typescript
import { useQuery } from '@tanstack/react-query';

import { listMyTrips } from '../api/trips';

export function useTrips() {
  return useQuery({ queryKey: ['trips', 'mine'], queryFn: listMyTrips });
}
```

- [ ] **Step 4: TripCard component**

```typescript
import { useRouter } from 'expo-router';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Trip } from '../api/trips';

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { locale } = useTranslation();
  const dateRange = formatDateRange(trip.start_date, trip.end_date, locale);
  return (
    <PixelCard onPress={() => router.push(`/(modals)/trip/${trip.id}`)} variant="default" padding="md" className="mb-3">
      <PixelText size="h3" family="heading">{trip.name}</PixelText>
      <PixelText size="small" className="mt-1 text-text-secondary">{dateRange}</PixelText>
      {trip.destination_country && (
        <PixelText size="small" className="mt-1 text-text-secondary">📍 {trip.destination_country}</PixelText>
      )}
    </PixelCard>
  );
}

function formatDateRange(start: string | null, end: string | null, locale: string): string {
  if (!start && !end) return '—';
  const fmt = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  if (start && end) return `${fmt.format(new Date(start))} → ${fmt.format(new Date(end))}`;
  return fmt.format(new Date((start ?? end)!));
}
```

- [ ] **Step 5: My Trips tab screen**

`src/app/(tabs)/trips.tsx`:
```typescript
import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useTrips } from '@features/trips/hooks/useTrips';
import { TripCard } from '@features/trips/components/TripCard';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

export default function TripsTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: trips = [], isLoading } = useTrips();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream" style={{ paddingTop: insets.top }}>
        <PixelText>{t('common.loading')}</PixelText>
      </View>
    );
  }

  if (trips.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-cream px-6" style={{ paddingTop: insets.top }}>
        <PixelText size="h2" className="mb-2 text-center">{t('trips.list.empty.title')}</PixelText>
        <PixelText size="body" className="mb-6 text-center text-text-secondary">{t('trips.list.empty.subtitle')}</PixelText>
        <PixelButton onPress={() => router.push('/(modals)/create-trip')}>{t('trips.list.empty.cta')}</PixelButton>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream px-4" style={{ paddingTop: insets.top + 12 }}>
      <View className="mb-3 flex-row items-center justify-between">
        <PixelText size="h1">{t('trips.list.title')}</PixelText>
        <PixelButton size="sm" onPress={() => router.push('/(modals)/create-trip')}>+ New</PixelButton>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
    </View>
  );
}
```

- [ ] **Step 6: Tests + code-validator + commit**

```bash
git commit -m "feat(trips): My Trips tab with empty state + list + TripCard + tests"
```

---

## Task 15: Create Trip modal

**Files:**
- Create: `src/app/(modals)/create-trip.tsx`
- Create: `src/features/trips/screens/CreateTripScreen.tsx`
- Add i18n keys (already in Task 14).

- [ ] **Step 1: CreateTripScreen with react-hook-form + zod**

```typescript
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTranslation } from '@core/i18n';
import { CountryPicker } from '@features/profile/components/CountryPicker';
import { createTrip } from '@features/trips/api/trips';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

export function CreateTripScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createTrip({
        name: name.trim(),
        start_date: startDate?.toISOString().slice(0, 10) ?? null,
        end_date: endDate?.toISOString().slice(0, 10) ?? null,
        destination_country: country,
      }),
    onSuccess: (trip) => {
      qc.invalidateQueries({ queryKey: ['trips', 'mine'] });
      router.replace(`/(modals)/trip/${trip.id}`);
    },
  });

  const canSubmit = name.trim().length >= 2;

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24 }}>
      <PixelText size="h1" className="mb-4">{t('trips.create.title')}</PixelText>

      <PixelInput
        label={t('trips.create.nameLabel')}
        placeholder={t('trips.create.namePlaceholder')}
        value={name}
        onChangeText={setName}
        required
        containerClassName="mb-4"
      />

      <PixelText size="small" family="body-medium" className="mb-1">{t('trips.create.startDateLabel')}</PixelText>
      <PixelButton variant="ghost" onPress={() => setShowStart(true)} fullWidth className="mb-4">
        {startDate ? startDate.toLocaleDateString() : 'Pick…'}
      </PixelButton>
      {showStart && (
        <DateTimePicker value={startDate ?? new Date()} mode="date" onChange={(_, d) => { setShowStart(false); if (d) setStartDate(d); }} />
      )}

      <PixelText size="small" family="body-medium" className="mb-1">{t('trips.create.endDateLabel')}</PixelText>
      <PixelButton variant="ghost" onPress={() => setShowEnd(true)} fullWidth className="mb-4">
        {endDate ? endDate.toLocaleDateString() : 'Pick…'}
      </PixelButton>
      {showEnd && (
        <DateTimePicker value={endDate ?? new Date()} mode="date" onChange={(_, d) => { setShowEnd(false); if (d) setEndDate(d); }} />
      )}

      <View className="mb-6">
        <CountryPicker value={country} onChange={setCountry} label={t('trips.create.destinationLabel')} />
      </View>

      <PixelButton onPress={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} fullWidth className="mb-3">
        {t('trips.create.createButton')}
      </PixelButton>
      <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
        {t('common.cancel')}
      </PixelButton>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Install `@react-native-community/datetimepicker`**

```bash
npx expo install @react-native-community/datetimepicker
```

- [ ] **Step 3: Wire `src/app/(modals)/create-trip.tsx` → CreateTripScreen.**

- [ ] **Step 4: Tests + code-validator + commit**

Tests: mock createTrip api, verify mutation fires on submit, verify cannot submit empty name.

```bash
git commit -m "feat(trips): create trip modal with name/dates/country + invalidates trip list"
```

---

## Task 16: Trip detail placeholder screen

**Files:**
- Create: `src/app/(modals)/trip/[id].tsx`
- Create: `src/features/trips/screens/TripDetailScreen.tsx`
- Create: `src/features/trips/hooks/useTrip.ts`

- [ ] **Step 1: useTrip hook**

```typescript
import { useQuery } from '@tanstack/react-query';

import { getTrip } from '../api/trips';

export function useTrip(id: string) {
  return useQuery({ queryKey: ['trips', id], queryFn: () => getTrip(id), enabled: Boolean(id) });
}
```

- [ ] **Step 2: TripDetailScreen (placeholder showing trip metadata + delete button)**

```typescript
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@core/i18n';
import { deleteTrip } from '@features/trips/api/trips';
import { useTrip } from '@features/trips/hooks/useTrip';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: trip, isLoading } = useTrip(id ?? '');

  const del = useMutation({
    mutationFn: () => deleteTrip(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', 'mine'] });
      router.back();
    },
  });

  if (isLoading || !trip) {
    return (
      <View className="flex-1 items-center justify-center bg-cream" style={{ paddingTop: insets.top }}>
        <PixelText>{t('common.loading')}</PixelText>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24 }}>
      <PixelText size="h1" className="mb-4">{trip.name}</PixelText>
      <PixelCard className="mb-4">
        <PixelText size="small" className="text-text-secondary">Status: {trip.status}</PixelText>
        <PixelText size="small" className="text-text-secondary">Visibility: {trip.visibility}</PixelText>
        <PixelText size="small" className="text-text-secondary">
          {trip.start_date} → {trip.end_date}
        </PixelText>
      </PixelCard>
      <PixelText size="body" className="mb-4 text-text-secondary">
        Path UI + map will land in Phase 2. For now this is a placeholder.
      </PixelText>
      <PixelButton variant="danger" onPress={() => Alert.alert('Delete trip?', 'This cannot be undone.', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => del.mutate() },
      ])} loading={del.isPending} fullWidth>
        {t('common.delete')}
      </PixelButton>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Wire `src/app/(modals)/trip/[id].tsx` → TripDetailScreen + commit + code-validator**

```bash
git commit -m "feat(trips): trip detail placeholder + delete confirm"
```

---

## Task 17: Trip members + invitations (magic link)

**Files:**
- Create: `src/features/trips/api/members.ts`
- Create: `src/features/trips/hooks/useTripMembers.ts`
- Create: `src/features/trips/components/InviteMemberForm.tsx`
- Modify: `TripDetailScreen.tsx` to show members + invite form
- Edge function for invitation acceptance: `supabase/functions/accept-invitation/index.ts`

- [ ] **Step 1: members.ts api**

```typescript
import { supabase } from '@core/supabase/client';

import type { Database } from '@core/supabase/types';

export type TripMember = Database['public']['Tables']['trip_members']['Row'];
export type TripInvitation = Database['public']['Tables']['trip_invitations']['Row'];

export async function listMembers(tripId: string): Promise<(TripMember & { profile: { display_name: string | null; avatar_sprite_id: string | null } })[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*, profile:profiles(display_name, avatar_sprite_id)')
    .eq('trip_id', tripId);
  if (error) throw error;
  return data as never;
}

export async function createInvitation(tripId: string, email: string | null): Promise<TripInvitation> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('trip_invitations')
    .insert({ trip_id: tripId, email, invited_by: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function acceptInvitation(token: string): Promise<{ trip_id: string }> {
  // Will be processed by edge function (handles trip_members insert in single transaction).
  const { data, error } = await supabase.functions.invoke<{ trip_id: string }>('accept-invitation', {
    body: { token },
  });
  if (error) throw error;
  if (!data) throw new Error('No data returned');
  return data;
}

export function buildInvitationLink(token: string): string {
  return `https://thisisthejourney.app/invite/${token}`;
}
```

- [ ] **Step 2: useTripMembers hook**

```typescript
import { useQuery } from '@tanstack/react-query';

import { listMembers } from '../api/members';

export function useTripMembers(tripId: string) {
  return useQuery({ queryKey: ['trip-members', tripId], queryFn: () => listMembers(tripId), enabled: Boolean(tripId) });
}
```

- [ ] **Step 3: InviteMemberForm component** — input email + button → create invitation → show shareable link.

- [ ] **Step 4: Edge function `supabase/functions/accept-invitation/index.ts`**

Deploy via `mcp__plugin_supabase_supabase__deploy_edge_function` with `name='accept-invitation'`, `verify_jwt=true`, body:
```typescript
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response('Unauthorized', { status: 401 });
  const userJwt = auth.replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(userJwt);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { token } = await req.json();
  if (!token) return new Response('token required', { status: 400 });

  const { data: inv, error: invErr } = await admin
    .from('trip_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (invErr || !inv) return new Response('Invitation not found', { status: 404 });
  if (inv.accepted_at) return new Response('Invitation already accepted', { status: 409 });
  if (new Date(inv.expires_at) < new Date()) return new Response('Invitation expired', { status: 410 });

  // Atomic: insert member + mark accepted
  const { error: memErr } = await admin
    .from('trip_members')
    .insert({ trip_id: inv.trip_id, user_id: user.id, role: inv.role });
  if (memErr && !memErr.message.includes('duplicate')) return new Response(memErr.message, { status: 500 });

  await admin
    .from('trip_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', inv.id);

  return new Response(JSON.stringify({ trip_id: inv.trip_id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 5: Add deep-link handler for `/invite/{token}` route in `src/app/_layout.tsx`** — when URL contains `/invite/{token}`, call acceptInvitation and route to the trip.

- [ ] **Step 6: Commit + code-validator**

```bash
git commit -m "feat(trips): members listing + invitation creation + accept-invitation edge function"
```

---

## Task 18: Home tab — upcoming trip card + sign-out

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

- [ ] **Step 1: Home shows current/upcoming trip if any, else welcome empty state**

```typescript
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useProfile } from '@features/profile/hooks/useProfile';
import { useTrips } from '@features/trips/hooks/useTrips';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export default function HomeTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: trips = [] } = useTrips();
  const upcoming = trips.find((t) => t.start_date && new Date(t.start_date) >= new Date());

  return (
    <View className="flex-1 bg-cream px-6" style={{ paddingTop: insets.top + 24 }}>
      <PixelText size="h1" className="mb-2">
        {profile?.display_name ? `Hey ${profile.display_name} 👋` : 'Hey adventurer 👋'}
      </PixelText>
      <PixelText size="body" className="mb-6 text-text-secondary">{t('app.tagline')}</PixelText>

      {upcoming ? (
        <PixelCard onPress={() => router.push(`/(modals)/trip/${upcoming.id}`)} padding="lg">
          <PixelText size="caption" className="text-text-secondary">NEXT TRIP</PixelText>
          <PixelText size="h2" family="heading-bold" className="mt-1">{upcoming.name}</PixelText>
          <PixelText size="small" className="mt-1 text-text-secondary">{upcoming.start_date}</PixelText>
        </PixelCard>
      ) : (
        <PixelCard padding="lg">
          <PixelText size="h3" className="mb-2">No upcoming trip</PixelText>
          <PixelText size="body" className="mb-4 text-text-secondary">Plan your first adventure.</PixelText>
          <PixelButton onPress={() => router.push('/(modals)/create-trip')}>+ Create trip</PixelButton>
        </PixelCard>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Commit + code-validator**

```bash
git commit -m "feat(home): personalized greeting + upcoming trip card OR empty state"
```

---

## Task 19: First-login routing — auto open onboarding if profile incomplete

**Files:**
- Modify: `src/features/auth/components/AuthGuard.tsx` to redirect to onboarding when profile.display_name is null.

- [ ] **Step 1: Enhance AuthGuard**

```typescript
import { Redirect } from 'expo-router';
import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useProfile } from '@features/profile/hooks/useProfile';

import { useSession } from '../hooks/useSession';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (sessionLoading || (session && profileLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#E63946" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (profile && !profile.display_name) return <Redirect href="/(modals)/onboarding" />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Commit + code-validator**

```bash
git commit -m "feat(auth): redirect to onboarding when profile incomplete"
```

---

## Task 20: Final integration tests + cleanup + push

- [ ] **Step 1: Run full test suite**
```bash
npm test -- --ci
```
Expected: all tests pass.

- [ ] **Step 2: Typecheck + lint + format**
```bash
npm run typecheck && npm run lint && npm run format:check
```
Expected: 0 errors.

- [ ] **Step 3: Invoke code-validator agent for full audit.**

- [ ] **Step 4: Update CLAUDE.md — mark Phase 1 done.**

- [ ] **Step 5: Push to GitHub + verify CI green.**

```bash
git push
gh run list --repo AMOSKILL45/Journey --limit 1
```

---

## Phase 1 — Completion criteria

When you finish this plan:

- ✅ 4 tables in Supabase: `profiles`, `trips`, `trip_members`, `trip_invitations` with RLS
- ✅ Generated TS types in `src/core/supabase/types.ts`
- ✅ 4 new design system components: PixelButton, PixelCard, PixelInput, PixelChip (with tests)
- ✅ Auth flow: magic link sign-in → check email → deep link callback → session active
- ✅ Onboarding screen: display name + avatar sprite picker + passport country
- ✅ 5-tab bottom bar shell with AuthGuard
- ✅ Home tab: greeting + upcoming trip card OR empty state
- ✅ My Trips tab: list + create button + empty state
- ✅ Create trip modal: name + dates + destination country
- ✅ Trip detail placeholder: meta + delete confirm
- ✅ Trip members: list + invite form + accept-invitation edge function
- ✅ First-login routing: auto-onboarding if profile incomplete
- ✅ All tests passing, CI green, pushed to GitHub
- ✅ 12 avatar sprite placeholders bundled
- ✅ i18n keys for auth, profile, tabs, trips namespaces (FR + EN)

**Deferred to Phase 1.5**:
- Apple Sign-In + Google Sign-In
- Passport verification Tier 2 (MRZ OCR) + Tier 3 (Stripe Identity)
- Real Kenney sprite assets to replace placeholders
- Email-template customization for Supabase Auth magic link

**Deferred to Phase 2** (per spec):
- Milestones table + schema
- Path UI (Duolingo-style)
- Sprite library for milestones

**Estimated total**: ~20 tasks, ~12-15 commits, 2 weeks of focused work (~30h).
