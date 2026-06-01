import {
  DEFAULT_LEAD_TIMES,
  REMINDER_TYPES,
  documentCategoryToReminderType,
} from '../utils/reminderTypes';

describe('reminderTypes', () => {
  it('exposes the v1.0 reminder types', () => {
    expect(REMINDER_TYPES).toEqual([
      'passport_expiry',
      'visa_expiry',
      'esta_expiry',
      'driving_license_expiry',
      'travel_insurance_expiry',
      'custom',
    ]);
  });
  it('passport defaults to 180/90/30/7', () => {
    expect(DEFAULT_LEAD_TIMES.passport_expiry).toEqual([180, 90, 30, 7]);
  });
  it('maps document categories to reminder types', () => {
    expect(documentCategoryToReminderType('visa')).toBe('visa_expiry');
    expect(documentCategoryToReminderType('travel_insurance')).toBe('travel_insurance_expiry');
    expect(documentCategoryToReminderType('insurance')).toBe('travel_insurance_expiry');
    expect(documentCategoryToReminderType('boarding_pass')).toBeNull();
  });
});
