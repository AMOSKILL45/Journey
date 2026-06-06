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
