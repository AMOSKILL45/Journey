-- Phase 4D KB pilot seed (Ralph loop): ~14 high-traffic FR/EN-market destinations.
-- These are DRAFTS pending human source-checking (ADR-1): rows default to not-approved-for-display
-- and are NOT surfaced to users until a human checks each against the official sources below.
-- last_verified here = authoring date (2026-06-06), not a human verification date.
-- See docs/superpowers/specs/2026-06-06-journey-kb-reminders-pilot-design.md.
INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, applies_to_passport_countries,
   trip_duration_max_days, trip_purpose, severity, i18n_key, action_url,
   estimated_processing_days, estimated_cost_usd, followup_lead_times, last_verified, source_urls)
VALUES
  ('nz_nzeta','NZ','{}','eta','{FR,DE,US,GB,CA,JP,SG,IT,ES,NL}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.nz_nzeta','https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta',
   3,17,'{30,14}','2026-06-06','{https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta}'),
  ('korea_keta','KR','{}','eta','{FR,DE,US,GB,CA,AU,NL,IT,ES,SE}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.korea_keta','https://www.k-eta.go.kr/',
   3,10,'{30,14}','2026-06-06','{https://www.k-eta.go.kr/}'),
  ('vietnam_evisa','VN','{}','visa','{FR,DE,US,GB,CA,AU,JP}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.vietnam_evisa','https://evisa.gov.vn/',
   5,25,'{30,14}','2026-06-06','{https://evisa.gov.vn/}'),
  ('indonesia_voa','ID','{}','visa','{FR,DE,US,GB,CA,AU,JP}',30,'{tourism}','strongly_recommended',
   'smartReminders.kb.indonesia_voa','https://molina.imigrasi.go.id/',
   1,35,'{14}','2026-06-06','{https://molina.imigrasi.go.id/}'),
  ('turkey_evisa','TR','{}','visa','{US,CA,AU}',90,'{tourism,business}','recommended',
   'smartReminders.kb.turkey_evisa','https://www.evisa.gov.tr/',
   1,50,'{30,14}','2026-06-06','{https://www.evisa.gov.tr/}')
ON CONFLICT (id) DO NOTHING;

-- Batch 2: Egypt, Morocco, UAE, Kenya, South Africa.
INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, applies_to_passport_countries,
   trip_duration_max_days, trip_purpose, severity, i18n_key, action_url,
   estimated_processing_days, estimated_cost_usd, followup_lead_times, last_verified, source_urls)
VALUES
  ('egypt_evisa','EG','{}','visa','{FR,DE,US,GB,CA,AU,IT,ES,NL,JP}',30,'{tourism}','strongly_recommended',
   'smartReminders.kb.egypt_evisa','https://visa2egypt.gov.eg/',
   7,25,'{30,14}','2026-06-06','{https://visa2egypt.gov.eg/}'),
  ('morocco_entry','MA','{}','other','{FR,DE,US,GB,CA,IT,ES,NL,JP,AU}',90,'{tourism,business}','good_to_know',
   'smartReminders.kb.morocco_entry','https://www.consulat.ma/',
   NULL,NULL,'{14}','2026-06-06','{https://www.consulat.ma/}'),
  ('uae_voa','AE','{}','other','{FR,DE,US,GB,CA,IT,ES,NL,JP,AU}',30,'{tourism,business}','good_to_know',
   'smartReminders.kb.uae_voa','https://www.icp.gov.ae/',
   NULL,NULL,'{14}','2026-06-06','{https://www.icp.gov.ae/en/}'),
  ('kenya_eta','KE','{}','eta','{}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.kenya_eta','https://www.etakenya.go.ke/',
   3,34,'{30,14}','2026-06-06','{https://www.etakenya.go.ke/}'),
  ('south_africa_entry','ZA','{}','other','{FR,DE,US,GB,CA,IT,ES,NL,JP,AU}',90,'{tourism,business}','good_to_know',
   'smartReminders.kb.south_africa_entry','http://www.dha.gov.za/',
   NULL,NULL,'{14}','2026-06-06','{http://www.dha.gov.za/index.php/immigration-services/types-of-visas}')
ON CONFLICT (id) DO NOTHING;

-- Batch 3: Mexico, Argentina, Schengen short-stay visa, UK Standard Visitor (last two = visa-required passports).
INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, applies_to_passport_countries,
   trip_duration_max_days, trip_purpose, severity, i18n_key, action_url,
   estimated_processing_days, estimated_cost_usd, followup_lead_times, last_verified, source_urls)
VALUES
  ('mexico_tourist','MX','{}','other','{FR,DE,US,GB,CA,IT,ES,NL,JP,AU}',180,'{tourism,business}','good_to_know',
   'smartReminders.kb.mexico_tourist','https://www.inm.gob.mx/',
   NULL,NULL,'{14}','2026-06-06','{https://www.inm.gob.mx/}'),
  ('argentina_visa_free','AR','{}','other','{FR,DE,US,GB,CA,IT,ES,NL,JP,AU}',90,'{tourism,business}','good_to_know',
   'smartReminders.kb.argentina_visa_free','https://www.argentina.gob.ar/interior/migraciones',
   NULL,NULL,'{14}','2026-06-06','{https://www.argentina.gob.ar/interior/migraciones}'),
  ('schengen_visa_short_stay',NULL,'{schengen}','visa','{IN,CN,ZA,NG,KE,EG,MA,DZ,TR,RU,TH,VN,ID,PH}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.schengen_visa_short_stay','https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en',
   15,90,'{60,30}','2026-06-06','{https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en}'),
  ('uk_standard_visitor','GB','{}','visa','{IN,CN,ZA,NG,KE,EG,MA,DZ,TR,RU,TH,VN,ID,PH}',180,'{tourism,business}','mandatory',
   'smartReminders.kb.uk_standard_visitor','https://www.gov.uk/standard-visitor',
   15,160,'{60,30}','2026-06-06','{https://www.gov.uk/standard-visitor}')
ON CONFLICT (id) DO NOTHING;
