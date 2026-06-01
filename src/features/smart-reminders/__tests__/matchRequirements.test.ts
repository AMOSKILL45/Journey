import { ruleMatches, type RequirementRule, type TripContext } from '../utils/matchRequirements';

const base: RequirementRule = {
  id: 'x',
  destination_country: 'US',
  destination_regions: [],
  requirement_type: 'eta',
  applies_to_passport_countries: ['FR'],
  excluded_passport_countries: [],
  trip_duration_min_days: null,
  trip_duration_max_days: 90,
  trip_purpose: ['tourism'],
  passport_validity_required_months: null,
};
const ctx: TripContext = {
  destinationCountry: 'US',
  destinationCountries: ['US'],
  durationDays: 10,
  purpose: 'tourism',
  passportCountry: 'FR',
};

describe('ruleMatches', () => {
  it('matches on destination + passport whitelist + duration + purpose', () => {
    expect(ruleMatches(base, ctx)).toBe(true);
  });
  it('rejects when passport not in whitelist', () => {
    expect(ruleMatches(base, { ...ctx, passportCountry: 'JP' })).toBe(false);
  });
  it('rejects when excluded passport', () => {
    expect(ruleMatches({ ...base, excluded_passport_countries: ['FR'] }, ctx)).toBe(false);
  });
  it('rejects when duration exceeds max', () => {
    expect(ruleMatches(base, { ...ctx, durationDays: 120 })).toBe(false);
  });
  it('rejects when purpose mismatches', () => {
    expect(ruleMatches(base, { ...ctx, purpose: 'business' })).toBe(false);
  });
  it('matches region rules via the schengen list', () => {
    const r: RequirementRule = {
      ...base,
      destination_country: null,
      destination_regions: ['schengen'],
      applies_to_passport_countries: [],
      trip_purpose: [],
    };
    expect(ruleMatches(r, { ...ctx, destinationCountry: 'FR', destinationCountries: ['FR'] })).toBe(
      true,
    );
  });
  it('matches when whitelist empty (applies to all passports)', () => {
    expect(
      ruleMatches(
        { ...base, applies_to_passport_countries: [] },
        { ...ctx, passportCountry: 'JP' },
      ),
    ).toBe(true);
  });
});
