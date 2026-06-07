# KB verification results — 2026-06-07 (agent web pass)

> 6 web agents verified the 49 drafted `country_requirements` rules against official government sources.
> **35 confirmed → flipped to `verified=true` (now live).** The **13 corrections** and **1 uncertain** below
> stayed `verified=false` (invisible) and need a fix before they go live. Prod: 67 rows = 53 approved + 14 drafts.

## ⚠️ Corrections needed (13 — still drafts)

Apply the fix, then `UPDATE country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='<id>';`

| id                         | Problem found (vs official source)                                                                                                          | Suggested fix                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `korea_keta`               | K-ETA is **temporarily waived** for visa-waiver nationalities (incl. all targeted) **through 2026-12-31** — not "mandatory" right now.      | severity `mandatory`→`good_to_know`; reword body to "optional until 31 Dec 2026 (skips the arrival card)". |
| `turkey_evisa`             | US & AU ordinary passports are **visa-exempt** (90/180); CA isn't e-Visa-eligible. The rule tells `{US,CA,AU}` they need an e-Visa — wrong. | Re-scope or drop: these 3 don't need an e-Visa. (e-Visa applies to _other_ nationalities.)                 |
| `oman_evisa`               | These 10 passports all get **14-day visa-free** entry; e-Visa not required for short stays.                                                 | severity→`good_to_know`; reword to "visa-free up to 14 days; e-Visa only for longer stays".                |
| `sri_lanka_eta`            | ETA still mandatory but **free** for these 10 nationalities since **2026-05-25** (not ~$50).                                                | `estimated_cost_usd` 50→0; body "free ETA".                                                                |
| `nz_nzeta`                 | IVL tourist levy is a **separate ~NZD100** charge, not included in the ~NZD17 NZeTA fee.                                                    | body: IVL additional (~NZD100).                                                                            |
| `egypt_evisa`              | Single-entry e-Visa fee **$25 → $30**.                                                                                                      | `estimated_cost_usd` 25→30.                                                                                |
| `saudi_evisa`              | Online tourist e-Visa ≈ **US$117** (440 SAR incl. insurance), not ~$140.                                                                    | `estimated_cost_usd` 140→117.                                                                              |
| `ethiopia_evisa`           | 30-day e-Visa fee cut **$82 → ~$62**.                                                                                                       | `estimated_cost_usd` 82→62 (human confirm exact on evisa.gov.et — JS page).                                |
| `schengen_visa_short_stay` | Adult short-stay fee **€80 → €90** (since 2024-06-11). Passport list correct.                                                               | `estimated_cost_usd` 90→~98 (€90).                                                                         |
| `uk_standard_visitor`      | Standard Visitor fee **~£115 → £135**. Requirement + ~3-week processing correct.                                                            | `estimated_cost_usd` 160→~170 (£135).                                                                      |
| `kenya_eta`                | "ALL nationalities" overstated — most **African nationals + EAC exempt** since 2025 (target passports still need it).                       | body: "all travellers except exempt categories (most African nationals/EAC)".                              |
| `south_africa_entry`       | Only **1 blank page** required for visa-exempt visitors (not "2+"); passport valid 1 month past departure.                                  | body: 1 blank page.                                                                                        |
| `jordan_visa`              | Jordan Pass waives the visa fee **only with a min 2-night (3-day) stay** — else 40 JOD at departure.                                        | body: add the 2-night minimum.                                                                             |

## ❓ Uncertain (1 — still draft)

| id               | Why uncertain                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cambodia_evisa` | Official `evisa.gov.kh` was unreachable (redirect loop). Fee may have dropped **$36 → $30**; 30-day single-entry + VOA facts look correct. Needs a human check of the current fee. |

## ✅ Confirmed & live (35)

Flipped 2026-06-07: vietnam_evisa, indonesia_voa, morocco_entry, uae_voa, mexico_tourist, argentina_visa_free, singapore_visa_free, malaysia_visa_free, philippines_visa_free, nepal_voa, qatar_visa_free, peru_visa_free, colombia_visa_free, chile_visa_free, costa_rica_visa_free, cuba_tourist_card, tanzania_visa, us_b1b2_visa, dominican_republic_eticket, jamaica_visa_free, panama_visa_free, nigeria_visa, ghana_visa, senegal_visa_free, myanmar_evisa, bangladesh_voa, maldives_visa_free, laos_evisa, mongolia_visa_free, ecuador_visa_free, uruguay_visa_free, ireland_visa_free, georgia_visa_free, bahrain_evisa, taiwan_visa_free.

### Enhancements worth adding to confirmed rules (not blocking — claims hold)

- `cuba_tourist_card` — **US passports**: tourism legally prohibited (OFAC 12 categories); insurance must be non-US; a Cuba visit later voids US ESTA/VWP eligibility. Worth a US-specific warning.
- `us_b1b2_visa` — a **+US$250 "Visa Integrity Fee"** (2025 law) is pending, not yet collected; $185 correct today.
- `argentina_visa_free` — mandatory travel insurance (min US$20k) since 2025-07-01.
- `georgia_visa_free` — travel medical insurance (min 30,000 GEL) required since 2026-01-01.
- `costa_rica_visa_free` — stay raised to up to 180 days (Nov 2025); onward ticket + ~US$100/mo funds.
- `mongolia_visa_free` — US actually gets 90 days; the 30-day EU tier is a temporary exemption (re-check before 2027).
- `peru_visa_free` — TAM is now fully digital (no paper slip to "keep").
- `taiwan_visa_free` — online arrival card within 3 days before arrival.

> Note: several official portals block automated fetching (gob.pe 418, migracion.go.cr 403, evisa.gov.kh loop, JS-only SPAs). Agents corroborated via other official sources (travel.state.gov, gov.uk FCDO, EUR-Lex, official consulates) where the primary URL was unreachable. A human should still spot-check the fee figures flagged above.
