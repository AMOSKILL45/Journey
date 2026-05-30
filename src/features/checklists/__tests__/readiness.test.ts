import {
  checklistProgress,
  isItemComplete,
  isTripReady,
  itemProgress,
  lateTravelers,
  myOutstanding,
  type ReadinessInput,
  type ReadinessItem,
} from '../utils/readiness';

const travelers = ['u1', 'u2', 'u3'];

function item(over: Partial<ReadinessItem>): ReadinessItem {
  return {
    id: 'i1',
    checklist_id: 'c1',
    scope: 'shared',
    is_done: false,
    assigned_to: null,
    ...over,
  };
}

describe('readiness', () => {
  it('shared item is complete when is_done', () => {
    expect(isItemComplete(item({ scope: 'shared', is_done: true }), {}, travelers)).toBe(true);
    expect(isItemComplete(item({ scope: 'shared', is_done: false }), {}, travelers)).toBe(false);
  });

  it('per-traveler item is complete only when every traveler has a completion', () => {
    const it = item({ id: 'p', scope: 'per_traveler' });
    expect(isItemComplete(it, { p: ['u1', 'u2'] }, travelers)).toBe(false);
    expect(isItemComplete(it, { p: ['u1', 'u2', 'u3'] }, travelers)).toBe(true);
  });

  it('itemProgress reports X / N and who is missing', () => {
    const it = item({ id: 'p', scope: 'per_traveler' });
    expect(itemProgress(it, { p: ['u1'] }, travelers)).toEqual({
      x: 1,
      n: 3,
      missing: ['u2', 'u3'],
    });
  });

  it('checklistProgress counts complete items in that checklist', () => {
    const input: ReadinessInput = {
      items: [
        item({ id: 'a', checklist_id: 'c1', scope: 'shared', is_done: true }),
        item({ id: 'b', checklist_id: 'c1', scope: 'shared', is_done: false }),
        item({ id: 'c', checklist_id: 'c2', scope: 'shared', is_done: true }),
      ],
      completionsByItem: {},
      travelerIds: travelers,
    };
    expect(checklistProgress(input, 'c1')).toEqual({ done: 1, total: 2 });
  });

  it('trip is ready only when all items complete and there is at least one', () => {
    expect(isTripReady({ items: [], completionsByItem: {}, travelerIds: travelers })).toBe(false);
    const input: ReadinessInput = {
      items: [
        item({ id: 'a', scope: 'shared', is_done: true }),
        item({ id: 'p', scope: 'per_traveler' }),
      ],
      completionsByItem: { p: ['u1', 'u2', 'u3'] },
      travelerIds: travelers,
    };
    expect(isTripReady(input)).toBe(true);
  });

  it('myOutstanding returns my per-traveler gaps and shared items assigned to me', () => {
    const input: ReadinessInput = {
      items: [
        item({ id: 'p', scope: 'per_traveler' }),
        item({ id: 's', scope: 'shared', assigned_to: 'u1', is_done: false }),
        item({ id: 's2', scope: 'shared', assigned_to: 'u2', is_done: false }),
      ],
      completionsByItem: { p: ['u2'] },
      travelerIds: travelers,
    };
    expect(
      myOutstanding(input, 'u1')
        .map((i) => i.id)
        .sort(),
    ).toEqual(['p', 's']);
  });

  it('lateTravelers are those with an unfinished per-traveler item', () => {
    const input: ReadinessInput = {
      items: [item({ id: 'p', scope: 'per_traveler' })],
      completionsByItem: { p: ['u1'] },
      travelerIds: travelers,
    };
    expect(lateTravelers(input).sort()).toEqual(['u2', 'u3']);
  });
});
