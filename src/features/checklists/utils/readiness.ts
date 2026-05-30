export type ItemScope = 'shared' | 'per_traveler';

export interface ReadinessItem {
  id: string;
  checklist_id: string;
  scope: ItemScope;
  is_done: boolean;
  assigned_to: string | null;
}

export interface ReadinessInput {
  items: ReadinessItem[];
  completionsByItem: Record<string, string[]>;
  travelerIds: string[];
}

export function itemProgress(
  it: ReadinessItem,
  completionsByItem: Record<string, string[]>,
  travelerIds: string[],
): { x: number; n: number; missing: string[] } {
  const done = new Set(completionsByItem[it.id] ?? []);
  const missing = travelerIds.filter((id) => !done.has(id));
  return { x: travelerIds.length - missing.length, n: travelerIds.length, missing };
}

export function isItemComplete(
  it: ReadinessItem,
  completionsByItem: Record<string, string[]>,
  travelerIds: string[],
): boolean {
  if (it.scope === 'shared') return it.is_done;
  return itemProgress(it, completionsByItem, travelerIds).missing.length === 0;
}

export function checklistProgress(
  input: ReadinessInput,
  checklistId: string,
): { done: number; total: number } {
  const items = input.items.filter((i) => i.checklist_id === checklistId);
  const done = items.filter((i) =>
    isItemComplete(i, input.completionsByItem, input.travelerIds),
  ).length;
  return { done, total: items.length };
}

export function isTripReady(input: ReadinessInput): boolean {
  if (input.items.length === 0) return false;
  return input.items.every((i) => isItemComplete(i, input.completionsByItem, input.travelerIds));
}

export function myOutstanding(input: ReadinessInput, userId: string): ReadinessItem[] {
  return input.items.filter((i) => {
    if (i.scope === 'per_traveler') {
      return !(input.completionsByItem[i.id] ?? []).includes(userId);
    }
    return i.assigned_to === userId && !i.is_done;
  });
}

export function lateTravelers(input: ReadinessInput): string[] {
  return input.travelerIds.filter((id) =>
    input.items.some(
      (i) => i.scope === 'per_traveler' && !(input.completionsByItem[i.id] ?? []).includes(id),
    ),
  );
}
