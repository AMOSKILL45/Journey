# Smart-reminders KB coverage checklist (target ~150 rules)

> Tracks the `country_requirements` knowledge base (Phase 4D). The **engine is complete and live**;
> this is the **content backlog**. Every row needs ≥1 official `source_urls` entry and a real
> `last_verified` date set by a human verification pass before launch. AI may draft rows; a human
> verifies against official sources (entry rules change often and wrong info has real user impact).

## Shipped (migration `20260601090002_country_requirements.sql`) — 18 rules, last_verified 2026-06-01 (PENDING human verification)

- [x] `us_esta` — US ESTA (VWP passports)
- [x] `uk_eta` — UK ETA
- [x] `schengen_etias` — ETIAS ⚠️ **verify launch date** (has shifted)
- [x] `canada_eta` — Canada eTA
- [x] `australia_eta` — Australia ETA
- [x] `india_evisa` — India e-Visa
- [x] `brazil_visa` — Brazil visa ⚠️ **verify reinstatement scope/date** (US/CA/AU)
- [x] `china_visa` — China visa
- [x] `passport_validity_6mo` / `passport_validity_3mo`
- [x] `schengen_90_180` — 90/180 rule
- [x] `jp_visa_free_90`, `thailand_visa_free`
- [x] `yellow_fever_zone`, `vaccine_routine`
- [x] `cash_10k_eu`, `cash_10k_us`
- [x] `travel_insurance_schengen`

## Shipped — pilot batch (migration `20260606090002`, `verified=false` — PENDING human verification)

> Drafted via the Ralph loop (2026-06-06). Not surfaced to users until a human source-checks each row
> and flips `verified=true`. Covers backlog cells: SE-Asia, Turkey/Egypt/Morocco, Gulf, LatAm, Africa, Schengen/UK visa-required.

- [x] `nz_nzeta` — New Zealand NZeTA
- [x] `korea_keta` — South Korea K-ETA
- [x] `vietnam_evisa` — Vietnam e-Visa
- [x] `indonesia_voa` — Indonesia VOA / e-VOA
- [x] `turkey_evisa` — Türkiye e-Visa
- [x] `egypt_evisa` — Egypt e-Visa
- [x] `morocco_entry` — Morocco visa-free entry
- [x] `uae_voa` — UAE entry on arrival
- [x] `kenya_eta` — Kenya eTA
- [x] `south_africa_entry` — South Africa visa-free entry
- [x] `mexico_tourist` — Mexico tourist entry (FMM)
- [x] `argentina_visa_free` — Argentina visa-free entry
- [x] `schengen_visa_short_stay` — Schengen short-stay (type C) visa, visa-required passports
- [x] `uk_standard_visitor` — UK Standard Visitor visa, visa-required passports

## Backlog to ~150 — matrix to author + verify

Destinations (top ~30): US · GB · Schengen(26) · CA · AU · NZ · JP · KR · CN · IN · TH · VN · ID · SG · AE · TR · EG · MA · ZA · KE · BR · AR · MX · PE · CO · CU · CR · US territories …
Passport groups: EU/Schengen · US · GB · CA · AU · JP · KR · BR · IN · CN · ZA …
Requirement types: visa · eta · passport_validity · vaccine · cash_declaration · insurance · other

- [ ] US × non-VWP passports (visa B1/B2 guidance)
- [ ] Schengen × visa-required passports (short-stay Schengen visa)
- [ ] UK × visa-required passports (Standard Visitor visa)
- [ ] Japan/Korea × visa-required passports
- [ ] Gulf (AE/QA/SA) e-visa / visa-on-arrival per passport
- [ ] Turkey / Egypt / Morocco e-visa or VOA per passport
- [ ] Southeast Asia (VN e-visa, ID VOA, etc.) per passport
- [ ] Latin America (AR/MX/PE/CO) entry rules per passport
- [ ] Africa (ZA/KE/EG) visa + yellow-fever entry-from-zone rules
- [ ] Vaccine entry requirements (yellow fever transit, polio, etc.) by destination
- [ ] Per-destination passport-validity nuances (3mo vs 6mo blocks)
- [ ] … continue until ~150 source-verified rows, checking each cell off here

## How to add a batch

1. Append `INSERT … ON CONFLICT (id) DO NOTHING;` blocks to a new migration `…_country_requirements_full_seed.sql` (same column shape as the starter seed).
2. Add the matching `smartReminders.kb.<id>.{title,body}` keys to `en.json` + `fr.json`.
3. `apply_migration`, then run `npx jest src/features/smart-reminders/__tests__/contracts` — it fails if any seeded `i18n_key` lacks an en/fr title+body.
4. Check the cell off above and set `last_verified` to the verification date.
