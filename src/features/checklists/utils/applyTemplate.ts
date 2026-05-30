import {
  createChecklist,
  createItem,
  listTemplateItems,
  type ChecklistTemplate,
  type ChecklistTemplateItem,
  type ItemScope,
  type TripChecklist,
} from '../api/checklists';

export function resolveTemplateLabel(
  item: ChecklistTemplateItem,
  t: (key: string) => string,
): string {
  if (item.i18n_key) return t(item.i18n_key);
  return item.label ?? '';
}

/**
 * Applies a template to a trip: creates a new checklist titled after the template,
 * then inserts its items as normal editable checklist_items (labels frozen from i18n).
 * Never auto-applied — only called on explicit user action.
 */
export async function applyTemplate(
  tripId: string,
  template: ChecklistTemplate,
  t: (key: string) => string,
): Promise<TripChecklist> {
  const checklist = await createChecklist(tripId, t(`${template.i18n_key}.name`));
  const items = await listTemplateItems(template.id);
  for (const ti of items) {
    await createItem({
      checklistId: checklist.id,
      tripId,
      label: resolveTemplateLabel(ti, t),
      scope: ti.scope as ItemScope,
      category: ti.category,
    });
  }
  return checklist;
}
