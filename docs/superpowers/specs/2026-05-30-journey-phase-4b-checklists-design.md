# Phase 4B — Checklists — Design

> Sub-project 4B of Phase 4 (Documents + Checklist + Smart Reminders). Phase 4 was
> decomposed into 5 sub-systems; this spec covers **Checklists** only — the
> trip-readiness engine ("who's ready / who's late").
>
> Date: 2026-05-30 · Status: approved design (full scope), pre-plan

## 1. Context & relationships

Phase 4 decomposition: **4A Documents** ✅ done · **4B Checklists** (this) · 4C Push infra ·
4D Smart reminders · 4E Personal reminders.

This is the **full-scope** build (explicitly requested over the YAGNI variant): multiple named
checklists per trip, DB-backed templates (translatable, community-ready), drag-reorder,
dismissable suggestions, and Home aggregation.

- **↔ 4A Documents:** a checklist item may optionally link a document (`document_id`). Tapping
  a linked item opens the doc via `openDocument` from `@features/documents`.
- **↔ 4D Smart reminders (future):** the master spec's `trip_smart_reminders.added_to_checklist_item_id`
  means a reminder's "Add to checklist" will create a normal `checklist_items` row. The model must
  allow programmatic item creation — it does. No 4D work here.
- **Commandment 3** ("suggestions, never impositions"): templates are browsable and applied only
  on explicit user action; nothing is auto-added to a checklist.

## 2. Scope

**In scope (v1.0, full):**

- Multiple named checklists per trip (`is_default`, reorderable).
- Items: free-text label, description, category tag, **scope** (`shared` | `per_traveler`),
  `assigned_to` (shared), due date, optional document link, drag-reorder.
- **Per-traveler completion** tracked per member → "X/N done" + who's missing.
- **Readiness**: per-checklist + whole-trip "ready" rollup; "my checklist" (what I still owe);
  a readiness card on the trip screen and an aggregate card on Home.
- **Templates** (DB-backed, system-seeded, i18n-keyed, public-read; architected for v1.1
  community): browse + apply (copies editable items).
- **Quick-add chips** + **dismissable suggestions** (per-trip dismissal).
- Gamification: progress bar + completion animation (reuse `CheckinAnim`).

**Out of scope (later):**

- Country/context-aware suggestions (that's 4D smart reminders).
- Community-authored templates UI (v1.1; schema is ready).
- Auto-completing an item when a matching document is uploaded (manual link + manual check in v1).
- Cross-trip Home aggregation beyond a simple count card.

## 3. User stories

- As an editor, I create named checklists ("Before departure", "Packing") and items, marking each
  **shared** (one task for the group) or **per-traveler** (everyone does their own).
- As a member, I see a **per-traveler** item show "3/5 done" and exactly who's late.
- As a member, I open **my checklist** — only what _I_ still owe.
- As an editor, I **apply a template** to bootstrap a checklist, then edit the copied items freely.
- As an editor, I add a **suggested** item with one tap, or dismiss the suggestion.
- As anyone on the trip, I see a **readiness card**: "🎒 Ready: 3/5 — Bob, Léa late".
- As a **viewer**, I see everything read-only and cannot add, edit, check, or apply.

## 4. Data model

Migration `supabase/migrations/<ts>_trip_checklists.sql`. Six tables. Reuses `gen_random_uuid()`
and the existing `is_trip_member` / `is_trip_editor` SECURITY DEFINER helpers. `checklist_items`
**denormalizes `trip_id`** (set by the api = the checklist's trip) so RLS uses the proven
`is_trip_*(trip_id)` pattern directly.

```sql
-- 1. Named checklists per trip
CREATE TABLE public.trip_checklists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title       text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_checklists_trip ON public.trip_checklists(trip_id);

-- 2. Items
CREATE TABLE public.checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.trip_checklists(id) ON DELETE CASCADE,
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE, -- denormalized for RLS
  label        text NOT NULL,
  description  text,
  category     text NOT NULL DEFAULT '',
  scope        text NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared','per_traveler')),
  assigned_to  uuid REFERENCES auth.users(id),                 -- shared scope only
  due_date     date,
  document_id  uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  order_index  integer NOT NULL DEFAULT 0,
  is_done      boolean NOT NULL DEFAULT false,                 -- shared scope only
  done_at      timestamptz,
  done_by      uuid REFERENCES auth.users(id),
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_items_checklist ON public.checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_trip ON public.checklist_items(trip_id);

-- 3. Per-traveler completions
CREATE TABLE public.checklist_item_completions (
  item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  done_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

-- 4. System templates (community-ready)
CREATE TABLE public.checklist_templates (
  id         text PRIMARY KEY,                 -- 'international_trip'
  i18n_key   text NOT NULL,                    -- 'checklists.templates.international'
  icon_sprite text,
  is_system  boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),   -- NULL for system; set for v1.1 community
  sort_order integer NOT NULL DEFAULT 0
);

-- 5. Template items
CREATE TABLE public.checklist_template_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  i18n_key    text,                            -- system items resolve label via i18n
  label       text,                            -- v1.1 community fallback (raw text)
  scope       text NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared','per_traveler')),
  category    text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT template_item_label_present CHECK (i18n_key IS NOT NULL OR label IS NOT NULL)
);

-- 6. Per-trip dismissed suggestions
CREATE TABLE public.checklist_suggestion_dismissals (
  trip_id        uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  suggestion_key text NOT NULL,
  dismissed_by   uuid NOT NULL REFERENCES auth.users(id),
  dismissed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, suggestion_key)
);
```

After the migration: regenerate `src/core/supabase/types.ts`.

## 5. Row-Level Security

Viewers are strictly read-only everywhere.

| Table                             | SELECT                               | INSERT / UPDATE / DELETE                                 |
| --------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| `trip_checklists`                 | `is_trip_member(trip_id)`            | `is_trip_editor(trip_id)`                                |
| `checklist_items`                 | `is_trip_member(trip_id)`            | `is_trip_editor(trip_id)`                                |
| `checklist_item_completions`      | member of the item's trip            | `user_id = auth.uid()` **AND** editor of the item's trip |
| `checklist_suggestion_dismissals` | `is_trip_member(trip_id)`            | `is_trip_editor(trip_id)`                                |
| `checklist_templates` / `_items`  | all signed-in users (`USING (true)`) | none (admin-seeded v1.0)                                 |

```sql
ALTER TABLE public.trip_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_suggestion_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members SELECT checklists" ON public.trip_checklists FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));
CREATE POLICY "Editors write checklists" ON public.trip_checklists FOR ALL
  USING (public.is_trip_editor(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_editor(trip_id, auth.uid()));

CREATE POLICY "Members SELECT items" ON public.checklist_items FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));
CREATE POLICY "Editors write items" ON public.checklist_items FOR ALL
  USING (public.is_trip_editor(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_editor(trip_id, auth.uid()));

CREATE POLICY "Members SELECT completions" ON public.checklist_item_completions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.checklist_items i
                 WHERE i.id = item_id AND public.is_trip_member(i.trip_id, auth.uid())));
CREATE POLICY "Self+editor INSERT completions" ON public.checklist_item_completions FOR INSERT
  WITH CHECK (user_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.checklist_items i
                          WHERE i.id = item_id AND public.is_trip_editor(i.trip_id, auth.uid())));
CREATE POLICY "Self DELETE completions" ON public.checklist_item_completions FOR DELETE
  USING (user_id = auth.uid()
         AND EXISTS (SELECT 1 FROM public.checklist_items i
                     WHERE i.id = item_id AND public.is_trip_editor(i.trip_id, auth.uid())));

CREATE POLICY "Members SELECT dismissals" ON public.checklist_suggestion_dismissals FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));
CREATE POLICY "Editors write dismissals" ON public.checklist_suggestion_dismissals FOR ALL
  USING (public.is_trip_editor(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_editor(trip_id, auth.uid()));

-- Templates are non-sensitive curated inspiration; readable by anyone signed in.
-- Matches the repo's "Anyone authenticated can SELECT an invitation" USING (true) pattern.
CREATE POLICY "Read templates" ON public.checklist_templates FOR SELECT USING (true);
CREATE POLICY "Read template items" ON public.checklist_template_items FOR SELECT USING (true);
```

> The `FOR ALL` editor policies mirror the existing `trip_invitations` policy style. `consent`:
> a demoted viewer immediately loses write since the policy re-evaluates `is_trip_editor`.

## 6. Readiness logic (`utils/readiness.ts`, pure + TDD)

The heart of the feature — a pure module so it is exhaustively unit-tested (mirrors `pathLayout`).

Inputs: items (with scope/is_done), completions (item_id→Set<user_id>), and `travelerIds` =
the set of **owner+editor** member ids (viewers excluded). Definitions:

- **Item complete:** `shared` → `is_done`; `per_traveler` → every `travelerId` has a completion.
- **Per-traveler progress:** `X = completions ∩ travelerIds`, `N = travelerIds.size` → `X/N`,
  plus `missing = travelerIds − completions`.
- **Checklist complete:** all its items complete.
- **Trip ready:** all checklists complete (empty trip = not ready / "no tasks yet").
- **My outstanding:** `per_traveler` items I have not completed **+** `shared` items
  `assigned_to = me` and not done.
- **Per-member lateness** (for the readiness card): a traveler is "late" if they have ≥1
  outstanding per-traveler completion (optionally past `due_date`).

```ts
export interface ReadinessInput {
  items: ChecklistItem[];
  completionsByItem: Record<string, string[]>; // item_id -> user_ids
  travelerIds: string[];
}
export function isItemComplete(item, completionsByItem, travelerIds): boolean;
export function itemProgress(
  item,
  completionsByItem,
  travelerIds,
): { x: number; n: number; missing: string[] };
export function isTripReady(input): boolean;
export function myOutstanding(input, userId): ChecklistItem[];
export function lateTravelers(input): string[];
```

## 7. Templates

- Seeded via migration into `checklist_templates` + `checklist_template_items`. v1 ships ~4
  system templates: `international_trip`, `beach_sun`, `city_break`, `road_trip` (~6–8 items each).
- **Labels are i18n keys** (`checklists.templates.<id>.name`, `…items.<key>`) → translated FR/EN,
  editorially reviewable, consistent with the `country_requirements` pattern.
- **Apply flow** (`utils/applyTemplate.ts`): user browses → picks a template → it creates a new
  `trip_checklists` (title = template name) and inserts `checklist_items` resolving each template
  item's i18n label into a **free-text `label`** (frozen, editable). Never auto-applied.
- Community templates (v1.1) reuse the same tables via `is_system=false` + `created_by` and the
  `label` text fallback.

## 8. Module structure & API

Mirrors `src/features/documents`. **No new dependencies.**

```
src/features/checklists/
  api/checklists.ts          # checklists + items + completions + templates + dismissals
  hooks/useChecklist.ts      # lists/items/completions queries + CRUD mutations
  hooks/useReadiness.ts      # derives readiness from useChecklist data
  utils/readiness.ts         # pure (TDD)
  utils/applyTemplate.ts     # template -> editable items
  components/ChecklistItemRow.tsx
  components/ChecklistSection.tsx     # one checklist: grouped items, progress, reorder
  components/ChecklistPicker.tsx      # switch between named checklists
  components/AddItemSheet.tsx         # create/edit an item
  components/TemplatePickerSheet.tsx  # browse + apply
  components/SuggestionChips.tsx      # quick-add + dismissable
  components/ReadinessCard.tsx        # who's ready / late
  screens/ChecklistScreen.tsx
  index.ts · __tests__/
```

### API surface (`api/checklists.ts`)

```ts
// Checklists
listChecklists(tripId): Promise<TripChecklist[]>
ensureDefaultChecklist(tripId): Promise<TripChecklist>   // auto-create if none
createChecklist(tripId, title): Promise<TripChecklist>
reorderChecklists(ordered: {id,order_index}[]): Promise<void>
deleteChecklist(id): Promise<void>
// Items
listItems(tripId): Promise<ChecklistItem[]>              // all items across the trip's checklists
createItem(input: CreateItemInput): Promise<ChecklistItem>
updateItem(id, patch): Promise<ChecklistItem>
reorderItems(ordered: {id,order_index}[]): Promise<void>
deleteItem(id): Promise<void>
setSharedDone(id, done: boolean): Promise<void>          // shared scope
// Completions (per-traveler)
listCompletions(tripId): Promise<ChecklistCompletion[]>
toggleMyCompletion(itemId, done: boolean): Promise<void> // user_id = self
// Templates + suggestions
listTemplates(): Promise<ChecklistTemplate[]>
applyTemplate(tripId, templateId): Promise<TripChecklist>
listDismissals(tripId): Promise<string[]>
dismissSuggestion(tripId, key): Promise<void>
```

## 9. UI / UX

- **Entry:** a **Checklist** button on `TripDetailScreen` → route `(modals)/checklist/[tripId].tsx`.
- **ChecklistScreen:** `ChecklistPicker` (chips/tabs when >1 checklist) · progress bar (`X/N` of the
  selected checklist) · **All / My checklist** toggle · items grouped by category, drag-reorder ·
  each `ChecklistItemRow` = checkbox + label + badges (scope, `X/N` for per-traveler, due date,
  📎 if doc-linked) · `SuggestionChips` (quick-add + dismissable) · **Start from template** button
  · FAB to add.
- **Check interaction:** tap checkbox → `CheckinAnim` burst; shared → `setSharedDone`,
  per-traveler → `toggleMyCompletion` (my part only). Long-press a per-traveler badge → see who's
  done/missing.
- **AddItemSheet** (`PixelBottomSheet`): label, scope (Shared/Per-traveler), category (chips +
  free text), assignee (shared only, from members), due date (`@react-native-community/datetimepicker`,
  already a dep), optional document link (picker over the trip's docs).
- **TemplatePickerSheet:** lists templates (name + item count) → Apply.
- **ReadinessCard:** on `TripDetailScreen` ("🎒 Ready 3/5 — Bob, Léa late") and an aggregate card on
  Home (count of my outstanding items across upcoming trips).
- All strings via `t('checklists.*')`; zero hardcoded strings. Tapping a doc-linked item calls
  `openDocument` from `@features/documents`.

## 10. i18n, testing, edge cases

- **i18n:** `checklists.*` (UI) + `checklists.templates.*` (template names + item labels), en + fr.
- **Testing:** `readiness.test.ts` (exhaustive pure-logic: shared/per-traveler completion, X/N,
  trip-ready, my-outstanding, late) · `applyTemplate.test.ts` · `checklists-api.test.ts`
  (mock supabase) · `ChecklistItemRow.test.tsx` (states) · `ReadinessCard.test.tsx` · contract
  test (i18n keys, route file, template-id ↔ i18n key coverage).
- **Edge cases:** member joins/leaves → `N` and `X/N` recompute live · doc unlinked on delete →
  `document_id` NULL · per-traveler→shared conversion keeps the earliest completion as `done_by` ·
  deleting a checklist cascades items + completions · `ensureDefaultChecklist` creates one on first
  open if none · assignee/assigned member removed → `assigned_to` dangles (treat unassigned).

## 11. Implementation outline (detailed plan via writing-plans)

1. Migration: 6 tables + RLS + template seed (4 templates); regen types.
2. i18n: `checklists.*` + `checklists.templates.*` (en + fr).
3. `utils/readiness.ts` + tests (pure, first — the core).
4. `utils/applyTemplate.ts` + tests.
5. `api/checklists.ts` (+ tests) → `hooks/useChecklist.ts` + `hooks/useReadiness.ts`.
6. Components: `ChecklistItemRow` (+test) → `AddItemSheet` → `ChecklistSection` → `ChecklistPicker`
   → `SuggestionChips` → `TemplatePickerSheet` → `ReadinessCard` (+test).
7. `screens/ChecklistScreen` + route + barrel + `TripDetailScreen` entry + Home aggregate card.
8. Contract tests + final validation.

```

```
