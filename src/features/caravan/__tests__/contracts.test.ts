import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';
import { CARAVAN_EVENT } from '@features/caravan/utils/caravanProtocol';
// Import the topic helper directly (not via the realtime barrel) to avoid pulling
// useTripChannel → @features/milestones → expo-image into this contract test.
import { tripTopic } from '@features/realtime/utils/channel';

describe('caravan contracts', () => {
  it('caravan event name is the wire constant', () => {
    expect(CARAVAN_EVENT).toBe('caravan');
  });

  it('broadcasts on the members-only trip topic (ADR-005)', () => {
    // The caravan rides the Phase 5 private trip:{id} channel — pin the topic shape.
    expect(tripTopic('abc')).toBe('trip:abc');
  });

  it('caravan i18n keys exist in both locales', () => {
    for (const loc of [en, fr] as const) {
      expect(loc.caravan?.lead).toBeTruthy();
      expect(loc.caravan?.leading).toBeTruthy();
      expect(loc.caravan?.following).toBeTruthy();
      expect(loc.caravan?.break).toBeTruthy();
      expect(loc.caravan?.join).toBeTruthy();
      expect(loc.caravan?.stop).toBeTruthy();
    }
  });

  it('following / join labels interpolate a member name (%{name})', () => {
    for (const loc of [en, fr] as const) {
      expect(loc.caravan.following).toContain('%{name}');
      expect(loc.caravan.join).toContain('%{name}');
    }
  });
});
