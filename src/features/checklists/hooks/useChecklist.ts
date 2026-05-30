import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createChecklist,
  createItem,
  deleteChecklist,
  deleteItem,
  dismissSuggestion,
  listChecklists,
  listCompletions,
  listDismissals,
  listItems,
  setSharedDone,
  toggleMyCompletion,
  updateItem,
  type CreateItemInput,
} from '../api/checklists';

export const checklistsKey = (tripId: string) => ['checklists', tripId] as const;
export const itemsKey = (tripId: string) => ['checklist-items', tripId] as const;
export const completionsKey = (tripId: string) => ['checklist-completions', tripId] as const;
export const dismissalsKey = (tripId: string) => ['checklist-dismissals', tripId] as const;

export function useChecklists(tripId: string) {
  return useQuery({
    queryKey: checklistsKey(tripId),
    queryFn: () => listChecklists(tripId),
    enabled: Boolean(tripId),
  });
}
export function useChecklistItems(tripId: string) {
  return useQuery({
    queryKey: itemsKey(tripId),
    queryFn: () => listItems(tripId),
    enabled: Boolean(tripId),
  });
}
export function useCompletions(tripId: string) {
  return useQuery({
    queryKey: completionsKey(tripId),
    queryFn: () => listCompletions(tripId),
    enabled: Boolean(tripId),
  });
}
export function useDismissals(tripId: string) {
  return useQuery({
    queryKey: dismissalsKey(tripId),
    queryFn: () => listDismissals(tripId),
    enabled: Boolean(tripId),
  });
}

export function useChecklistMutations(tripId: string) {
  const qc = useQueryClient();
  const invItems = () => void qc.invalidateQueries({ queryKey: itemsKey(tripId) });
  const invComp = () => void qc.invalidateQueries({ queryKey: completionsKey(tripId) });
  const invLists = () => void qc.invalidateQueries({ queryKey: checklistsKey(tripId) });

  return {
    addItem: useMutation({
      mutationFn: (i: CreateItemInput) => createItem(i),
      onSuccess: invItems,
    }),
    editItem: useMutation({
      mutationFn: (p: { id: string; patch: Parameters<typeof updateItem>[1] }) =>
        updateItem(p.id, p.patch),
      onSuccess: invItems,
    }),
    removeItem: useMutation({ mutationFn: (id: string) => deleteItem(id), onSuccess: invItems }),
    setShared: useMutation({
      mutationFn: (p: { id: string; done: boolean }) => setSharedDone(p.id, p.done),
      onSuccess: invItems,
    }),
    toggleMine: useMutation({
      mutationFn: (p: { itemId: string; done: boolean }) => toggleMyCompletion(p.itemId, p.done),
      onSuccess: invComp,
    }),
    addChecklist: useMutation({
      mutationFn: (title: string) => createChecklist(tripId, title),
      onSuccess: invLists,
    }),
    removeChecklist: useMutation({
      mutationFn: (id: string) => deleteChecklist(id),
      onSuccess: () => {
        invLists();
        invItems();
      },
    }),
    dismiss: useMutation({
      mutationFn: (key: string) => dismissSuggestion(tripId, key),
      onSuccess: () => void qc.invalidateQueries({ queryKey: dismissalsKey(tripId) }),
    }),
  };
}
