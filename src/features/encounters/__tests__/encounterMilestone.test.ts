import {
  CATEGORY_TO_MILESTONE_TYPE,
  encounterToMilestoneInput,
} from '@features/encounters/utils/encounterMilestone';
import type { Encounter } from '@features/encounters/utils/encounterMilestone';

const enc = (over: Partial<Encounter> = {}): Encounter => ({
  name: 'Sunset Point',
  category: 'viewpoint',
  lat: 1.5,
  lng: 2.5,
  distance_m: 180,
  tags: {},
  ...over,
});

describe('encounterToMilestoneInput', () => {
  it('maps an encounter to a milestone creation input', () => {
    const input = encounterToMilestoneInput(enc(), 'trip-1');
    expect(input).toMatchObject({
      trip_id: 'trip-1',
      name: 'Sunset Point',
      type: 'landmark',
      lat: 1.5,
      lng: 2.5,
    });
  });

  it('maps a cafe encounter to the food milestone type', () => {
    const input = encounterToMilestoneInput(
      enc({ category: 'cafe', name: 'Bean There' }),
      'trip-9',
    );
    expect(input.type).toBe('food');
    expect(input.name).toBe('Bean There');
  });

  it('maps an attraction encounter to the activity milestone type', () => {
    expect(encounterToMilestoneInput(enc({ category: 'attraction' }), 't').type).toBe('activity');
  });

  it('defaults an unknown category to landmark', () => {
    expect(encounterToMilestoneInput(enc({ category: 'totally-unknown' }), 't').type).toBe(
      'landmark',
    );
  });

  it('exposes a category→type map keyed by lowercase category', () => {
    expect(CATEGORY_TO_MILESTONE_TYPE.viewpoint).toBe('landmark');
    expect(CATEGORY_TO_MILESTONE_TYPE.cafe).toBe('food');
  });

  it('is case-insensitive on the category', () => {
    expect(encounterToMilestoneInput(enc({ category: 'CAFE' }), 't').type).toBe('food');
  });
});
