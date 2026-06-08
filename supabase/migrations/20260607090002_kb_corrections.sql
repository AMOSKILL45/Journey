-- KB corrections (2026-06-07) from the agent verification pass.
-- See docs/superpowers/reference/kb-verification-results.md. Under the Waze model (spec 2026-06-07),
-- `verified` is a trust badge, not a visibility gate, so setting it here is intentional and safe.

-- Fee updates (official sources):
UPDATE public.country_requirements SET estimated_cost_usd = 30  WHERE id = 'egypt_evisa';
UPDATE public.country_requirements SET estimated_cost_usd = 117 WHERE id = 'saudi_evisa';
UPDATE public.country_requirements SET estimated_cost_usd = 62  WHERE id = 'ethiopia_evisa';
UPDATE public.country_requirements SET estimated_cost_usd = 98  WHERE id = 'schengen_visa_short_stay'; -- €90
UPDATE public.country_requirements SET estimated_cost_usd = 170 WHERE id = 'uk_standard_visitor';      -- £135
UPDATE public.country_requirements SET estimated_cost_usd = 0   WHERE id = 'sri_lanka_eta';            -- now free

-- Severity downgrades (no longer mandatory / over-stated):
UPDATE public.country_requirements SET severity = 'good_to_know' WHERE id IN ('korea_keta', 'oman_evisa');

-- Türkiye e-Visa: re-scope away from US/CA/AU (visa-exempt or not e-visa-eligible) to e-visa-eligible
-- nationalities. International scope (ADR D5). Stays verified=false (new scope, not yet source-confirmed
-- → shows the "verify" badge; refine via the human/crowd loop).
UPDATE public.country_requirements
  SET applies_to_passport_countries = '{IN,ZA,EG,DZ,BD,PH,MX,DO,MV,TW,SA,BH,AM}'
  WHERE id = 'turkey_evisa';

-- Flip the 12 corrected, source-checked rules to the verified (✓) badge.
-- turkey_evisa (re-scoped, unconfirmed) and cambodia_evisa (fee uncertain) intentionally stay verified=false.
UPDATE public.country_requirements SET verified = true, last_verified = CURRENT_DATE
  WHERE id IN (
    'korea_keta', 'oman_evisa', 'sri_lanka_eta', 'nz_nzeta', 'egypt_evisa', 'saudi_evisa',
    'ethiopia_evisa', 'schengen_visa_short_stay', 'uk_standard_visitor', 'kenya_eta',
    'south_africa_entry', 'jordan_visa'
  );
