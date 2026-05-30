import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type TripChecklist = Database['public']['Tables']['trip_checklists']['Row'];
export type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
export type ChecklistCompletion = Database['public']['Tables']['checklist_item_completions']['Row'];
export type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row'];
export type ChecklistTemplateItem = Database['public']['Tables']['checklist_template_items']['Row'];
export type ItemScope = 'shared' | 'per_traveler';

export interface CreateItemInput {
  checklistId: string;
  tripId: string;
  label: string;
  scope: ItemScope;
  description?: string | null;
  category?: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  documentId?: string | null;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// --- Checklists ---
export async function listChecklists(tripId: string): Promise<TripChecklist[]> {
  const { data, error } = await supabase
    .from('trip_checklists')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createChecklist(tripId: string, title: string): Promise<TripChecklist> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('trip_checklists')
    .insert({ trip_id: tripId, title, created_by: uid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function ensureDefaultChecklist(tripId: string): Promise<TripChecklist> {
  const existing = await listChecklists(tripId);
  if (existing.length > 0) return existing[0];
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('trip_checklists')
    .insert({ trip_id: tripId, title: '', is_default: true, created_by: uid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChecklist(id: string): Promise<void> {
  const { error } = await supabase.from('trip_checklists').delete().eq('id', id);
  if (error) throw error;
}

// --- Items ---
export async function listItems(tripId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createItem(input: CreateItemInput): Promise<ChecklistItem> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      checklist_id: input.checklistId,
      trip_id: input.tripId,
      label: input.label,
      scope: input.scope,
      description: input.description ?? null,
      category: input.category ?? '',
      assigned_to: input.scope === 'shared' ? (input.assignedTo ?? null) : null,
      due_date: input.dueDate ?? null,
      document_id: input.documentId ?? null,
      created_by: uid,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(
  id: string,
  patch: Database['public']['Tables']['checklist_items']['Update'],
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('checklist_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id);
  if (error) throw error;
}

export async function setSharedDone(id: string, done: boolean): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('checklist_items')
    .update({
      is_done: done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? uid : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function reorderItems(ordered: { id: string; order_index: number }[]): Promise<void> {
  for (const row of ordered) {
    const { error } = await supabase
      .from('checklist_items')
      .update({ order_index: row.order_index })
      .eq('id', row.id);
    if (error) throw error;
  }
}

// --- Completions ---
export async function listCompletions(tripId: string): Promise<ChecklistCompletion[]> {
  const items = await listItems(tripId);
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('checklist_item_completions')
    .select('*')
    .in('item_id', ids);
  if (error) throw error;
  return data ?? [];
}

export async function toggleMyCompletion(itemId: string, done: boolean): Promise<void> {
  const uid = await currentUserId();
  if (done) {
    const { error } = await supabase
      .from('checklist_item_completions')
      .insert({ item_id: itemId, user_id: uid });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('checklist_item_completions')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', uid);
    if (error) throw error;
  }
}

// --- Templates ---
export async function listTemplates(): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// --- Suggestion dismissals ---
export async function listDismissals(tripId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('checklist_suggestion_dismissals')
    .select('suggestion_key')
    .eq('trip_id', tripId);
  if (error) throw error;
  return (data ?? []).map((r) => r.suggestion_key);
}

export async function dismissSuggestion(tripId: string, key: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('checklist_suggestion_dismissals')
    .insert({ trip_id: tripId, suggestion_key: key, dismissed_by: uid });
  if (error) throw error;
}
