export const REMINDER_TYPES = [
  'passport_expiry',
  'visa_expiry',
  'esta_expiry',
  'driving_license_expiry',
  'travel_insurance_expiry',
  'custom',
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const DEFAULT_LEAD_TIMES: Record<ReminderType, number[]> = {
  passport_expiry: [180, 90, 30, 7],
  visa_expiry: [60, 30, 7],
  esta_expiry: [60, 30],
  driving_license_expiry: [60, 14],
  travel_insurance_expiry: [30, 7],
  custom: [30, 7],
};

const DOC_CATEGORY_MAP: Record<string, ReminderType> = {
  visa: 'visa_expiry',
  esta: 'esta_expiry',
  driving_license: 'driving_license_expiry',
  insurance: 'travel_insurance_expiry', // 4A document category
  travel_insurance: 'travel_insurance_expiry',
};

export function documentCategoryToReminderType(category: string): ReminderType | null {
  return DOC_CATEGORY_MAP[category] ?? null;
}
