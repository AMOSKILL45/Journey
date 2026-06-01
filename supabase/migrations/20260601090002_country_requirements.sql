-- Phase 4D: smart-reminders knowledge base. Curated, public-read, client write-protected.
CREATE TABLE IF NOT EXISTS public.country_requirements (
  id                                text PRIMARY KEY,
  destination_country               text,                       -- ISO alpha-2; NULL = region rule
  destination_regions               text[] NOT NULL DEFAULT '{}',
  requirement_type                  text NOT NULL,              -- visa|eta|vaccine|passport_validity|cash_declaration|insurance|other
  applies_to_passport_countries     text[] NOT NULL DEFAULT '{}',
  excluded_passport_countries       text[] NOT NULL DEFAULT '{}',
  trip_duration_min_days            int,
  trip_duration_max_days            int,
  trip_purpose                      text[] NOT NULL DEFAULT '{}',
  passport_validity_required_months int,
  required                          boolean NOT NULL DEFAULT true,
  severity                          text NOT NULL DEFAULT 'good_to_know'
                                      CHECK (severity IN ('mandatory','strongly_recommended','recommended','good_to_know')),
  i18n_key                          text NOT NULL,              -- base key; .title/.body/.actionLabel resolve client-side
  action_url                        text,
  estimated_processing_days         int,
  estimated_cost_usd                numeric,
  followup_lead_times               int[] NOT NULL DEFAULT '{60,30,7}',
  last_verified                     date NOT NULL,
  source_urls                       text[] NOT NULL DEFAULT '{}',
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_country_requirements_dest ON public.country_requirements(destination_country);

ALTER TABLE public.country_requirements ENABLE ROW LEVEL SECURITY;
-- Public read (curated, non-sensitive). No client write: seed/refresh via migration only.
DROP POLICY IF EXISTS "Read country_requirements" ON public.country_requirements;
CREATE POLICY "Read country_requirements" ON public.country_requirements FOR SELECT USING (true);

-- last_verified = authoring date; the full-seed migration runs the human verification pass before launch.
-- ETIAS launch + Brazil visa reinstatement are flagged for that pass.
INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, applies_to_passport_countries,
   trip_duration_max_days, trip_purpose, severity, i18n_key, action_url,
   estimated_processing_days, estimated_cost_usd, followup_lead_times, last_verified, source_urls)
VALUES
  ('us_esta','US','{}','eta','{FR,DE,ES,IT,GB,JP,AU,NL,BE,SE}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.us_esta','https://esta.cbp.dhs.gov/',3,21,'{60,30,7}','2026-06-01',
   '{https://esta.cbp.dhs.gov/,https://travel.state.gov/}'),
  ('uk_eta','GB','{}','eta','{FR,DE,ES,IT,US,JP,AU,NL,BE,SE}',180,'{tourism,business}','mandatory',
   'smartReminders.kb.uk_eta','https://www.gov.uk/eta',3,16,'{30,14}','2026-06-01',
   '{https://www.gov.uk/eta}'),
  ('schengen_etias',NULL,'{schengen}','eta','{US,GB,AU,CA,JP,BR}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.schengen_etias','https://travel-europe.europa.eu/etias_en',4,8,'{60,30}','2026-06-01',
   '{https://travel-europe.europa.eu/etias_en}'),
  ('canada_eta','CA','{}','eta','{FR,DE,GB,JP,AU,NL,BE,SE}',180,'{tourism,business}','mandatory',
   'smartReminders.kb.canada_eta','https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
   1,7,'{30,14}','2026-06-01','{https://www.canada.ca/}'),
  ('australia_eta','AU','{}','eta','{US,GB,JP,SG}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.australia_eta','https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
   2,15,'{30,14}','2026-06-01','{https://immi.homeaffairs.gov.au/}'),
  ('india_evisa','IN','{}','visa','{FR,DE,US,GB,AU,JP}',30,'{tourism}','mandatory',
   'smartReminders.kb.india_evisa','https://indianvisaonline.gov.in/evisa/',4,25,'{30,14}','2026-06-01',
   '{https://indianvisaonline.gov.in/evisa/}'),
  ('brazil_visa','BR','{}','visa','{US,CA,AU}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.brazil_visa','https://www.gov.br/mre/',10,81,'{60,30}','2026-06-01',
   '{https://www.gov.br/mre/}'),
  ('china_visa','CN','{}','visa','{FR,DE,US,GB,AU,JP}',30,'{tourism}','mandatory',
   'smartReminders.kb.china_visa','http://www.visaforchina.cn/',7,140,'{60,30}','2026-06-01',
   '{http://www.visaforchina.cn/}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, passport_validity_required_months,
   severity, i18n_key, followup_lead_times, last_verified, source_urls)
VALUES
  ('passport_validity_6mo',NULL,'{schengen,asia_6mo}','passport_validity',6,'mandatory',
   'smartReminders.kb.passport_validity_6mo','{90,30}','2026-06-01','{https://travel.state.gov/}'),
  ('passport_validity_3mo',NULL,'{schengen}','passport_validity',3,'strongly_recommended',
   'smartReminders.kb.passport_validity_3mo','{90,30}','2026-06-01','{https://travel-europe.europa.eu/}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, severity, i18n_key,
   followup_lead_times, last_verified, source_urls)
VALUES
  ('schengen_90_180',NULL,'{schengen}','other','good_to_know','smartReminders.kb.schengen_90_180',
   '{30}','2026-06-01','{https://europa.eu/youreurope/citizens/travel/}'),
  ('jp_visa_free_90','JP','{}','other','good_to_know','smartReminders.kb.jp_visa_free_90',
   '{14}','2026-06-01','{https://www.mofa.go.jp/}'),
  ('yellow_fever_zone',NULL,'{yellow_fever}','vaccine','strongly_recommended',
   'smartReminders.kb.yellow_fever_zone','{60,30}','2026-06-01','{https://www.who.int/}'),
  ('cash_10k_eu',NULL,'{schengen}','cash_declaration','good_to_know','smartReminders.kb.cash_10k_eu',
   '{7}','2026-06-01','{https://taxation-customs.ec.europa.eu/}'),
  ('cash_10k_us','US','{}','cash_declaration','good_to_know','smartReminders.kb.cash_10k_us',
   '{7}','2026-06-01','{https://www.cbp.gov/}'),
  ('thailand_visa_free','TH','{}','other','good_to_know','smartReminders.kb.thailand_visa_free',
   '{14}','2026-06-01','{https://www.thaievisa.go.th/}'),
  ('travel_insurance_schengen',NULL,'{schengen}','insurance','recommended',
   'smartReminders.kb.travel_insurance_schengen','{30,7}','2026-06-01','{https://travel-europe.europa.eu/}'),
  ('vaccine_routine',NULL,'{}','vaccine','good_to_know','smartReminders.kb.vaccine_routine',
   '{60}','2026-06-01','{https://wwwnc.cdc.gov/travel}')
ON CONFLICT (id) DO NOTHING;
