import { REGIONS } from './regions';

export interface RequirementRule {
  id: string;
  destination_country: string | null;
  destination_regions: string[];
  requirement_type: string;
  applies_to_passport_countries: string[];
  excluded_passport_countries: string[];
  trip_duration_min_days: number | null;
  trip_duration_max_days: number | null;
  trip_purpose: string[];
  passport_validity_required_months: number | null;
}

export interface TripContext {
  destinationCountry: string | null;
  destinationCountries: string[];
  durationDays: number | null;
  purpose: string | null;
  passportCountry: string | null;
}

function hitsDestination(rule: RequirementRule, ctx: TripContext): boolean {
  const dests = new Set([ctx.destinationCountry, ...ctx.destinationCountries].filter(Boolean));
  if (rule.destination_country && dests.has(rule.destination_country)) return true;
  return rule.destination_regions.some((r) => (REGIONS[r] ?? []).some((c) => dests.has(c)));
}

export function ruleMatches(rule: RequirementRule, ctx: TripContext): boolean {
  if (!hitsDestination(rule, ctx)) return false;

  if (ctx.passportCountry && rule.excluded_passport_countries.includes(ctx.passportCountry)) {
    return false;
  }
  if (rule.applies_to_passport_countries.length) {
    if (!ctx.passportCountry || !rule.applies_to_passport_countries.includes(ctx.passportCountry)) {
      return false;
    }
  }

  if (
    rule.trip_duration_min_days != null &&
    ctx.durationDays != null &&
    ctx.durationDays < rule.trip_duration_min_days
  ) {
    return false;
  }
  if (
    rule.trip_duration_max_days != null &&
    ctx.durationDays != null &&
    ctx.durationDays > rule.trip_duration_max_days
  ) {
    return false;
  }

  if (rule.trip_purpose.length && ctx.purpose && !rule.trip_purpose.includes(ctx.purpose)) {
    return false;
  }

  return true;
}
