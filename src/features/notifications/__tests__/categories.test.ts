import { NOTIFICATION_CATEGORIES, defaultPrefs, shouldSendCategory } from '../utils/categories';

describe('categories', () => {
  it('exposes the spec categories incl. always-on join', () => {
    expect(NOTIFICATION_CATEGORIES).toEqual(
      expect.arrayContaining([
        'friends_checkin',
        'friends_photo',
        'smart_reminders',
        'join',
        'polls',
        'achievements',
      ]),
    );
  });

  it('includes life_reminders as a category, on by default', () => {
    expect(NOTIFICATION_CATEGORIES).toContain('life_reminders');
    expect(defaultPrefs().categories.life_reminders).toBe(true);
  });

  it('defaults: enabled, all categories on, quiet hours on', () => {
    const p = defaultPrefs();
    expect(p.enabled).toBe(true);
    expect(p.quietHours).toBe(true);
    expect(p.categories.friends_checkin).toBe(true);
  });

  it('respects global off, category off, and always-on join', () => {
    expect(shouldSendCategory({ enabled: false, categories: {}, quietHours: true }, 'join')).toBe(
      true,
    );
    expect(shouldSendCategory({ enabled: false, categories: {}, quietHours: true }, 'polls')).toBe(
      false,
    );
    expect(
      shouldSendCategory(
        { enabled: true, categories: { polls: false }, quietHours: true },
        'polls',
      ),
    ).toBe(false);
    expect(
      shouldSendCategory({ enabled: true, categories: { join: false }, quietHours: true }, 'join'),
    ).toBe(true);
    expect(
      shouldSendCategory({ enabled: true, categories: {}, quietHours: true }, 'achievements'),
    ).toBe(true);
  });
});
