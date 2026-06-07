# KB draft verification worksheet

> **49 drafts** in `country_requirements` are `verified=false` (invisible to users). For EACH row: open the
> official source, confirm the claim is current and correct, then run its **Flip** SQL (sets `verified=true`
> and stamps `last_verified` to today). Tick the box. **Wrong visa/entry info has real user impact — verify
> against the official government source, not memory.** Entry rules change often; double-check fees, durations,
> and which passports each rule targets.
>
> Generated from migrations 090002/090003/090004 + `en.json`. Mirror ticks into `kb-coverage-checklist.md`.

## Pilot batch (Ralph, migration 090002) — 14

### [ ] `nz_nzeta` — NZeTA required (New Zealand) _(NZ, eta, mandatory)_

- **Claim:** Request your NZeTA online before flying to New Zealand — it also covers the IVL tourist levy. Allow a few days for approval.
- **Source:** <https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='nz_nzeta';`

### [ ] `korea_keta` — K-ETA required (South Korea) _(KR, eta, mandatory)_

- **Claim:** Apply for your K-ETA online before traveling to South Korea. Approval usually takes a few days.
- **Source:** <https://www.k-eta.go.kr/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='korea_keta';`

### [ ] `vietnam_evisa` — Vietnam e-Visa _(VN, visa, mandatory)_

- **Claim:** Apply for a Vietnam e-Visa online a few weeks before your trip — it now allows stays of up to 90 days.
- **Source:** <https://evisa.gov.vn/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='vietnam_evisa';`

### [ ] `indonesia_voa` — Indonesia visa on arrival _(ID, visa, strongly_recommended)_

- **Claim:** Most visitors need a Visa on Arrival for Bali/Indonesia. Buy the e-VOA online beforehand to skip the airport queue.
- **Source:** <https://molina.imigrasi.go.id/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='indonesia_voa';`

### [ ] `turkey_evisa` — Türkiye e-Visa _(TR, visa, recommended)_

- **Claim:** Some nationalities need an e-Visa for Türkiye. Apply online before you fly — it only takes a few minutes.
- **Source:** <https://www.evisa.gov.tr/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='turkey_evisa';`

### [ ] `egypt_evisa` — Egypt e-Visa _(EG, visa, strongly_recommended)_

- **Claim:** Apply for an Egypt e-Visa online before you travel. A single-entry tourist e-Visa is usually issued within a week.
- **Source:** <https://visa2egypt.gov.eg/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='egypt_evisa';`

### [ ] `morocco_entry` — Morocco — visa-free entry _(MA, other, good_to_know)_

- **Claim:** Many nationalities can enter Morocco visa-free for up to 90 days. Make sure your passport is valid for at least 6 months.
- **Source:** <https://www.consulat.ma/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='morocco_entry';`

### [ ] `uae_voa` — UAE — entry on arrival _(AE, other, good_to_know)_

- **Claim:** Most visitors get a free visa-on-arrival or visa-free entry to the UAE. Check the stay length allowed for your nationality.
- **Source:** <https://www.icp.gov.ae/en/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='uae_voa';`

### [ ] `kenya_eta` — Kenya eTA required _(KE, eta, mandatory)_

- **Claim:** All travelers to Kenya must get an electronic travel authorization (eTA) before arrival. Apply a few days ahead.
- **Source:** <https://www.etakenya.go.ke/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='kenya_eta';`

### [ ] `south_africa_entry` — South Africa — visa-free entry _(ZA, other, good_to_know)_

- **Claim:** Many nationalities can visit South Africa visa-free for up to 90 days. Bring a passport with at least two blank pages.
- **Source:** <http://www.dha.gov.za/index.php/immigration-services/types-of-visas>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='south_africa_entry';`

### [ ] `mexico_tourist` — Mexico — tourist entry _(MX, other, good_to_know)_

- **Claim:** Many nationalities can visit Mexico visa-free for up to 180 days. You receive a tourist permit (FMM) on arrival — keep it for departure.
- **Source:** <https://www.inm.gob.mx/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='mexico_tourist';`

### [ ] `argentina_visa_free` — Argentina — visa-free entry _(AR, other, good_to_know)_

- **Claim:** Many nationalities can enter Argentina visa-free for up to 90 days. Check that your passport is valid for the whole stay.
- **Source:** <https://www.argentina.gob.ar/interior/migraciones>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='argentina_visa_free';`

### [ ] `schengen_visa_short_stay` — Schengen short-stay visa _(NULL, visa, mandatory)_

- **Claim:** Your nationality may need a Schengen visa (type C) for trips up to 90 days. Apply at the consulate of your main destination several weeks ahead.
- **Source:** <https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='schengen_visa_short_stay';`

### [ ] `uk_standard_visitor` — UK Standard Visitor visa _(GB, visa, mandatory)_

- **Claim:** Your nationality may need a UK Standard Visitor visa. Apply online a few weeks before you travel — processing can take around 3 weeks.
- **Source:** <https://www.gov.uk/standard-visitor>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='uk_standard_visitor';`

<details><summary>Flip ALL of Pilot batch (Ralph, migration 090002) once every box above is checked</summary>

```sql
UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE
WHERE id IN ('nz_nzeta', 'korea_keta', 'vietnam_evisa', 'indonesia_voa', 'turkey_evisa', 'egypt_evisa', 'morocco_entry', 'uae_voa', 'kenya_eta', 'south_africa_entry', 'mexico_tourist', 'argentina_visa_free', 'schengen_visa_short_stay', 'uk_standard_visitor');
```

</details>

## Batch 2 (migration 090003) — 17

### [ ] `singapore_visa_free` — Singapore — arrival card _(SG, other, good_to_know)_

- **Claim:** Most visitors enter Singapore visa-free, but you must submit the free SG Arrival Card online within 3 days before you arrive.
- **Source:** <https://www.ica.gov.sg/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='singapore_visa_free';`

### [ ] `malaysia_visa_free` — Malaysia — digital arrival card _(MY, other, good_to_know)_

- **Claim:** Many nationalities enter Malaysia visa-free for up to 90 days. Submit the free Malaysia Digital Arrival Card (MDAC) before you travel.
- **Source:** <https://imigresen-online.imi.gov.my/mdac/main>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='malaysia_visa_free';`

### [ ] `philippines_visa_free` — Philippines — visa-free entry _(PH, other, good_to_know)_

- **Claim:** Many nationalities can visit the Philippines visa-free for 30 days. Register your eTravel online before arrival.
- **Source:** <https://etravel.gov.ph/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='philippines_visa_free';`

### [ ] `sri_lanka_eta` — Sri Lanka ETA _(LK, eta, mandatory)_

- **Claim:** Apply for a Sri Lanka ETA online before you fly. Approval is usually quick.
- **Source:** <https://eta.gov.lk/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='sri_lanka_eta';`

### [ ] `cambodia_evisa` — Cambodia e-Visa _(KH, visa, strongly_recommended)_

- **Claim:** Apply for a Cambodia e-Visa online a few days before your trip (visa on arrival is also available).
- **Source:** <https://www.evisa.gov.kh/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='cambodia_evisa';`

### [ ] `nepal_voa` — Nepal visa on arrival _(NP, visa, strongly_recommended)_

- **Claim:** Most visitors get a Nepal visa on arrival — fill the online form beforehand and bring USD plus a photo.
- **Source:** <https://www.immigration.gov.np/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='nepal_voa';`

### [ ] `qatar_visa_free` — Qatar — visa waiver _(QA, other, good_to_know)_

- **Claim:** Many nationalities get a free visa waiver on arrival in Qatar. Check the stay length allowed for your passport.
- **Source:** <https://hukoomi.gov.qa/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='qatar_visa_free';`

### [ ] `saudi_evisa` — Saudi Arabia e-Visa _(SA, visa, mandatory)_

- **Claim:** Apply for a Saudi tourist e-Visa online before you travel. (Hajj/Umrah uses a separate visa.)
- **Source:** <https://visa.visitsaudi.com/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='saudi_evisa';`

### [ ] `oman_evisa` — Oman e-Visa _(OM, visa, recommended)_

- **Claim:** Some nationalities need an Oman e-Visa; apply online before you fly. Short visa-free stays apply to others.
- **Source:** <https://evisa.rop.gov.om/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='oman_evisa';`

### [ ] `peru_visa_free` — Peru — visa-free entry _(PE, other, good_to_know)_

- **Claim:** Many nationalities can visit Peru visa-free. Keep your stamped entry slip for departure.
- **Source:** <https://www.gob.pe/migraciones>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='peru_visa_free';`

### [ ] `colombia_visa_free` — Colombia — visa-free entry _(CO, other, good_to_know)_

- **Claim:** Many nationalities can enter Colombia visa-free for up to 90 days. Fill the Check-Mig form before each flight.
- **Source:** <https://www.migracioncolombia.gov.co/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='colombia_visa_free';`

### [ ] `chile_visa_free` — Chile — visa-free entry _(CL, other, good_to_know)_

- **Claim:** Many nationalities can visit Chile visa-free for up to 90 days. Keep your tourist card (PDI) for departure.
- **Source:** <https://serviciomigraciones.cl/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='chile_visa_free';`

### [ ] `costa_rica_visa_free` — Costa Rica — visa-free entry _(CR, other, good_to_know)_

- **Claim:** Many nationalities can visit Costa Rica visa-free for up to 90 days. Bring proof of onward travel.
- **Source:** <https://www.migracion.go.cr/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='costa_rica_visa_free';`

### [ ] `cuba_tourist_card` — Cuba tourist card _(CU, visa, mandatory)_

- **Claim:** Cuba requires a tourist card (tarjeta del turista) plus travel insurance. Buy the card before you fly.
- **Source:** <https://misiones.minrex.gob.cu/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='cuba_tourist_card';`

### [ ] `tanzania_visa` — Tanzania visa _(TZ, visa, mandatory)_

- **Claim:** Apply for a Tanzania e-Visa online before you travel (single-entry tourist visa).
- **Source:** <https://eservices.immigration.go.tz/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='tanzania_visa';`

### [ ] `ethiopia_evisa` — Ethiopia e-Visa _(ET, visa, mandatory)_

- **Claim:** Apply for an Ethiopia e-Visa online before you fly — it is the simplest way to enter.
- **Source:** <https://www.evisa.gov.et/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='ethiopia_evisa';`

### [ ] `us_b1b2_visa` — US B1/B2 visitor visa _(US, visa, mandatory)_

- **Claim:** If your nationality is not in the Visa Waiver Program, apply for a US B1/B2 visa well ahead — interview wait times can be long.
- **Source:** <https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='us_b1b2_visa';`

<details><summary>Flip ALL of Batch 2 (migration 090003) once every box above is checked</summary>

```sql
UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE
WHERE id IN ('singapore_visa_free', 'malaysia_visa_free', 'philippines_visa_free', 'sri_lanka_eta', 'cambodia_evisa', 'nepal_voa', 'qatar_visa_free', 'saudi_evisa', 'oman_evisa', 'peru_visa_free', 'colombia_visa_free', 'chile_visa_free', 'costa_rica_visa_free', 'cuba_tourist_card', 'tanzania_visa', 'ethiopia_evisa', 'us_b1b2_visa');
```

</details>

## Batch 3 (migration 090004) — 18

### [ ] `dominican_republic_eticket` — Dominican Republic — e-Ticket _(DO, other, good_to_know)_

- **Claim:** Fill the free Dominican Republic e-Ticket online before departure and arrival. The tourist card is included in most airfares.
- **Source:** <https://eticket.migracion.gob.do/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='dominican_republic_eticket';`

### [ ] `jamaica_visa_free` — Jamaica — visa-free entry _(JM, other, good_to_know)_

- **Claim:** Many nationalities visit Jamaica visa-free. Complete the online immigration/customs form before you travel.
- **Source:** <https://www.pica.gov.jm/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='jamaica_visa_free';`

### [ ] `panama_visa_free` — Panama — visa-free entry _(PA, other, good_to_know)_

- **Claim:** Many nationalities can visit Panama visa-free. Bring proof of onward travel and sufficient funds.
- **Source:** <https://www.migracion.gob.pa/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='panama_visa_free';`

### [ ] `nigeria_visa` — Nigeria visa _(NG, visa, mandatory)_

- **Claim:** Nigeria requires a visa for most travelers — apply online ahead. A yellow fever certificate is also required.
- **Source:** <https://immigration.gov.ng/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='nigeria_visa';`

### [ ] `ghana_visa` — Ghana visa _(GH, visa, mandatory)_

- **Claim:** Ghana requires a visa for most travelers — apply ahead. A yellow fever certificate is required to enter.
- **Source:** <https://www.ghanaimmigration.org/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='ghana_visa';`

### [ ] `senegal_visa_free` — Senegal — visa-free entry _(SN, other, good_to_know)_

- **Claim:** Many nationalities visit Senegal visa-free for up to 90 days. A yellow fever vaccination is recommended.
- **Source:** <https://www.diplomatie.gouv.sn/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='senegal_visa_free';`

### [ ] `myanmar_evisa` — Myanmar e-Visa _(MM, visa, mandatory)_

- **Claim:** Apply for a Myanmar tourist e-Visa online before you travel.
- **Source:** <https://evisa.moip.gov.mm/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='myanmar_evisa';`

### [ ] `bangladesh_voa` — Bangladesh visa on arrival _(BD, visa, strongly_recommended)_

- **Claim:** Many travelers can get a Bangladesh visa on arrival; check requirements and bring USD for the fee.
- **Source:** <https://www.visa.gov.bd/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='bangladesh_voa';`

### [ ] `maldives_visa_free` — Maldives — free visa on arrival _(MV, other, good_to_know)_

- **Claim:** All visitors get a free 30-day visa on arrival. Submit the IMUGA traveller declaration within 96h before arrival.
- **Source:** <https://imuga.immigration.gov.mv/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='maldives_visa_free';`

### [ ] `laos_evisa` — Laos e-Visa _(LA, visa, strongly_recommended)_

- **Claim:** Apply for a Laos e-Visa online before you travel (visa on arrival is also available).
- **Source:** <https://laoevisa.gov.la/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='laos_evisa';`

### [ ] `mongolia_visa_free` — Mongolia — visa-free entry _(MN, other, good_to_know)_

- **Claim:** Many nationalities can visit Mongolia visa-free for up to 30 days. Check the latest list for your passport.
- **Source:** <https://immigration.gov.mn/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='mongolia_visa_free';`

### [ ] `ecuador_visa_free` — Ecuador — visa-free entry _(EC, other, good_to_know)_

- **Claim:** Many nationalities can visit Ecuador visa-free for up to 90 days per year.
- **Source:** <https://www.cancilleria.gob.ec/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='ecuador_visa_free';`

### [ ] `uruguay_visa_free` — Uruguay — visa-free entry _(UY, other, good_to_know)_

- **Claim:** Many nationalities can visit Uruguay visa-free for up to 90 days.
- **Source:** <https://www.gub.uy/ministerio-interior/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='uruguay_visa_free';`

### [ ] `ireland_visa_free` — Ireland — visa-free entry _(IE, other, good_to_know)_

- **Claim:** Many nationalities can visit Ireland visa-free (Ireland is not in the Schengen area — it is a separate entry).
- **Source:** <https://www.irishimmigration.ie/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='ireland_visa_free';`

### [ ] `georgia_visa_free` — Georgia — visa-free entry _(GE, other, good_to_know)_

- **Claim:** Many nationalities can stay in Georgia visa-free for up to a year. Check the list for your passport.
- **Source:** <https://www.geoconsul.gov.ge/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='georgia_visa_free';`

### [ ] `jordan_visa` — Jordan visa / Jordan Pass _(JO, visa, recommended)_

- **Claim:** Most travelers need a Jordan visa. Buying the Jordan Pass before arrival waives the visa fee and covers Petra.
- **Source:** <https://www.visitjordan.com/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='jordan_visa';`

### [ ] `bahrain_evisa` — Bahrain e-Visa _(BH, visa, recommended)_

- **Claim:** Apply for a Bahrain e-Visa online before you travel, or check if you are eligible for visa on arrival.
- **Source:** <https://www.evisa.gov.bh/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='bahrain_evisa';`

### [ ] `taiwan_visa_free` — Taiwan — visa-free entry _(TW, other, good_to_know)_

- **Claim:** Many nationalities can visit Taiwan visa-free for up to 90 days. Keep proof of onward travel.
- **Source:** <https://www.boca.gov.tw/>
- **Flip:** `UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE WHERE id='taiwan_visa_free';`

<details><summary>Flip ALL of Batch 3 (migration 090004) once every box above is checked</summary>

```sql
UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE
WHERE id IN ('dominican_republic_eticket', 'jamaica_visa_free', 'panama_visa_free', 'nigeria_visa', 'ghana_visa', 'senegal_visa_free', 'myanmar_evisa', 'bangladesh_voa', 'maldives_visa_free', 'laos_evisa', 'mongolia_visa_free', 'ecuador_visa_free', 'uruguay_visa_free', 'ireland_visa_free', 'georgia_visa_free', 'jordan_visa', 'bahrain_evisa', 'taiwan_visa_free');
```

</details>

## Flip EVERYTHING (only after every box above is checked & sourced)

```sql
UPDATE public.country_requirements SET verified=true, last_verified=CURRENT_DATE
WHERE id IN ('nz_nzeta', 'korea_keta', 'vietnam_evisa', 'indonesia_voa', 'turkey_evisa', 'egypt_evisa', 'morocco_entry', 'uae_voa', 'kenya_eta', 'south_africa_entry', 'mexico_tourist', 'argentina_visa_free', 'schengen_visa_short_stay', 'uk_standard_visitor', 'singapore_visa_free', 'malaysia_visa_free', 'philippines_visa_free', 'sri_lanka_eta', 'cambodia_evisa', 'nepal_voa', 'qatar_visa_free', 'saudi_evisa', 'oman_evisa', 'peru_visa_free', 'colombia_visa_free', 'chile_visa_free', 'costa_rica_visa_free', 'cuba_tourist_card', 'tanzania_visa', 'ethiopia_evisa', 'us_b1b2_visa', 'dominican_republic_eticket', 'jamaica_visa_free', 'panama_visa_free', 'nigeria_visa', 'ghana_visa', 'senegal_visa_free', 'myanmar_evisa', 'bangladesh_voa', 'maldives_visa_free', 'laos_evisa', 'mongolia_visa_free', 'ecuador_visa_free', 'uruguay_visa_free', 'ireland_visa_free', 'georgia_visa_free', 'jordan_visa', 'bahrain_evisa', 'taiwan_visa_free');
```
