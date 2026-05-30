-- Phase 4B: checklists (readiness engine). Editors write; members read; viewers read-only.
-- Reuses is_trip_member / is_trip_editor. checklist_items denormalizes trip_id for RLS.

CREATE TABLE IF NOT EXISTS public.trip_checklists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title       text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_checklists_trip ON public.trip_checklists(trip_id);

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.trip_checklists(id) ON DELETE CASCADE,
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  label        text NOT NULL,
  description  text,
  category     text NOT NULL DEFAULT '',
  scope        text NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared','per_traveler')),
  assigned_to  uuid REFERENCES auth.users(id),
  due_date     date,
  document_id  uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  order_index  integer NOT NULL DEFAULT 0,
  is_done      boolean NOT NULL DEFAULT false,
  done_at      timestamptz,
  done_by      uuid REFERENCES auth.users(id),
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_trip ON public.checklist_items(trip_id);

CREATE TABLE IF NOT EXISTS public.checklist_item_completions (
  item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  done_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id          text PRIMARY KEY,
  i18n_key    text NOT NULL,
  icon_sprite text,
  is_system   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  i18n_key    text,
  label       text,
  scope       text NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared','per_traveler')),
  category    text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT template_item_label_present CHECK (i18n_key IS NOT NULL OR label IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.checklist_suggestion_dismissals (
  trip_id        uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  suggestion_key text NOT NULL,
  dismissed_by   uuid NOT NULL REFERENCES auth.users(id),
  dismissed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, suggestion_key)
);

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

CREATE POLICY "Read templates" ON public.checklist_templates FOR SELECT USING (true);
CREATE POLICY "Read template items" ON public.checklist_template_items FOR SELECT USING (true);

-- Seed: 4 system templates (labels resolved client-side from i18n keys)
INSERT INTO public.checklist_templates (id, i18n_key, sort_order) VALUES
  ('international_trip', 'checklists.templates.international', 1),
  ('beach_sun',         'checklists.templates.beachSun',      2),
  ('city_break',        'checklists.templates.cityBreak',     3),
  ('road_trip',         'checklists.templates.roadTrip',      4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.checklist_template_items (template_id, i18n_key, scope, category, order_index) VALUES
  ('international_trip','checklists.templates.international.items.passport','per_traveler','documents',1),
  ('international_trip','checklists.templates.international.items.visa','per_traveler','documents',2),
  ('international_trip','checklists.templates.international.items.insurance','per_traveler','documents',3),
  ('international_trip','checklists.templates.international.items.flights','shared','transport',4),
  ('international_trip','checklists.templates.international.items.accommodation','shared','lodging',5),
  ('international_trip','checklists.templates.international.items.adapter','per_traveler','packing',6),
  ('international_trip','checklists.templates.international.items.bank','per_traveler','admin',7),
  ('beach_sun','checklists.templates.beachSun.items.sunscreen','per_traveler','packing',1),
  ('beach_sun','checklists.templates.beachSun.items.swimwear','per_traveler','packing',2),
  ('beach_sun','checklists.templates.beachSun.items.accommodation','shared','lodging',3),
  ('beach_sun','checklists.templates.beachSun.items.snorkel','shared','activities',4),
  ('beach_sun','checklists.templates.beachSun.items.aftersun','shared','packing',5),
  ('city_break','checklists.templates.cityBreak.items.transit','per_traveler','transport',1),
  ('city_break','checklists.templates.cityBreak.items.shoes','per_traveler','packing',2),
  ('city_break','checklists.templates.cityBreak.items.museums','shared','activities',3),
  ('city_break','checklists.templates.cityBreak.items.restaurants','shared','activities',4),
  ('city_break','checklists.templates.cityBreak.items.offlineMap','per_traveler','admin',5),
  ('road_trip','checklists.templates.roadTrip.items.license','per_traveler','documents',1),
  ('road_trip','checklists.templates.roadTrip.items.rentCar','shared','transport',2),
  ('road_trip','checklists.templates.roadTrip.items.insurance','shared','admin',3),
  ('road_trip','checklists.templates.roadTrip.items.playlist','shared','fun',4),
  ('road_trip','checklists.templates.roadTrip.items.snacks','shared','packing',5),
  ('road_trip','checklists.templates.roadTrip.items.stops','shared','activities',6)
ON CONFLICT DO NOTHING;
