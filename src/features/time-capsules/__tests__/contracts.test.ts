import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';
import type { Database } from '@core/supabase/types';
import { NOTIFICATION_CATEGORIES } from '@features/notifications/utils/categories';
import { SOUND_IDS } from '@features/feedback';

it('time_capsule is a registered notification category', () => {
  expect(NOTIFICATION_CATEGORIES).toContain('time_capsule');
});

it('capsule_open is a registered sound id', () => {
  expect(SOUND_IDS).toContain('capsule_open');
});

it('timeCapsules i18n keys exist in both locales', () => {
  for (const loc of [en, fr]) {
    expect(loc.timeCapsules?.notif?.title).toBeTruthy();
    expect(loc.timeCapsules?.create?.title).toBeTruthy();
    expect(loc.timeCapsules?.sealed).toBeTruthy();
    expect(loc.timeCapsules?.create?.seal).toBeTruthy();
    expect(loc.timeCapsules?.opensIn).toBeTruthy();
    expect(loc.timeCapsules?.empty).toBeTruthy();
  }
});

it('the time_capsules RPCs are present in the generated DB types', () => {
  // Compile-time guard: these index accesses fail to typecheck if the RPCs drift.
  type Fns = Database['public']['Functions'];
  type ListArgs = Fns['list_trip_capsules']['Args'];
  type OpenArgs = Fns['open_time_capsule']['Args'];
  const listArgs: ListArgs = { p_trip_id: 't1' };
  const openArgs: OpenArgs = { p_capsule_id: 'c1' };
  expect(listArgs.p_trip_id).toBe('t1');
  expect(openArgs.p_capsule_id).toBe('c1');
});
