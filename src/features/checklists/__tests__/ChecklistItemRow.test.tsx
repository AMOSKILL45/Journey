import { render } from '@testing-library/react-native';
import { type ComponentProps } from 'react';

import type { ChecklistItem } from '../api/checklists';
import { ChecklistItemRow } from '../components/ChecklistItemRow';

const baseItem = {
  id: 'i1',
  checklist_id: 'c1',
  trip_id: 't1',
  label: 'Get ESTA',
  description: null,
  category: 'documents',
  scope: 'per_traveler',
  assigned_to: null,
  due_date: null,
  document_id: null,
  order_index: 0,
  is_done: false,
  done_at: null,
  done_by: null,
  created_by: 'u1',
  created_at: '2026-05-30T00:00:00Z',
} as unknown as ChecklistItem;

function renderRow(over: Partial<ComponentProps<typeof ChecklistItemRow>> = {}) {
  return render(
    <ChecklistItemRow
      item={baseItem}
      complete={false}
      progressLabel="1/3"
      checked={false}
      canManage
      onToggle={jest.fn()}
      onEdit={jest.fn()}
      onOpenDoc={jest.fn()}
      {...over}
    />,
  );
}

describe('ChecklistItemRow', () => {
  it('renders the label and per-traveler progress', () => {
    const { getByText } = renderRow();
    expect(getByText('Get ESTA')).toBeTruthy();
    expect(getByText('1/3')).toBeTruthy();
  });

  it('shows the linked-doc badge when a document is attached', () => {
    const { getByTestId } = renderRow({
      item: { ...baseItem, document_id: 'd1' } as ChecklistItem,
    });
    expect(getByTestId('checklist-doc-badge')).toBeTruthy();
  });
});
