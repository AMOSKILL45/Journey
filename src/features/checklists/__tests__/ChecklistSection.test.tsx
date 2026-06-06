import { fireEvent, render } from '@testing-library/react-native';

import { ChecklistSection } from '../components/ChecklistSection';
import type { ChecklistItem } from '../api/checklists';
import type { ReadinessInput } from '../utils/readiness';

const mockAddOpen = jest.fn();

jest.mock('../hooks/useChecklist', () => ({
  useChecklistMutations: () => ({
    setShared: { mutate: jest.fn() },
    toggleMine: { mutate: jest.fn() },
    addItem: { mutate: jest.fn() },
    dismiss: { mutate: jest.fn() },
  }),
  useDismissals: () => ({ data: [] }),
}));

jest.mock('@features/documents', () => ({
  useTripDocuments: () => ({ data: [] }),
  openDocument: jest.fn(),
}));

jest.mock('../components/AddItemSheet', () => {
  const react = jest.requireActual('react') as typeof import('react');
  const AddItemSheet = react.forwardRef<{ open: () => void }>((_props, ref) => {
    react.useImperativeHandle(ref, () => ({ open: mockAddOpen }));
    return null;
  });
  AddItemSheet.displayName = 'AddItemSheet';
  return { AddItemSheet };
});
jest.mock('../components/TemplatePickerSheet', () => {
  const react = jest.requireActual('react') as typeof import('react');
  const TemplatePickerSheet = react.forwardRef(() => null);
  TemplatePickerSheet.displayName = 'TemplatePickerSheet';
  return { TemplatePickerSheet };
});

const emptyReadiness: ReadinessInput = {
  items: [],
  completionsByItem: {},
  travelerIds: ['u1'],
};

const item = (id: string, checklistId: string): ChecklistItem =>
  ({
    id,
    checklist_id: checklistId,
    trip_id: 't1',
    label: `Item ${id}`,
    category: 'documents',
    scope: 'shared',
    assigned_to: null,
    due_date: null,
    document_id: null,
    is_done: false,
  }) as unknown as ChecklistItem;

function renderSection(over: { items?: ChecklistItem[]; canManage?: boolean } = {}) {
  return render(
    <ChecklistSection
      tripId="t1"
      checklistId="c1"
      items={over.items ?? []}
      readiness={emptyReadiness}
      userId="u1"
      canManage={over.canManage ?? true}
      onApplied={jest.fn()}
    />,
  );
}

beforeEach(() => {
  mockAddOpen.mockClear();
});

describe('ChecklistSection empty state', () => {
  it('shows the empty state when the checklist has no items', () => {
    const { getByTestId, getByText } = renderSection({ items: [] });
    expect(getByTestId('checklist-empty')).toBeTruthy();
    fireEvent.press(getByText('Add an item'));
    expect(mockAddOpen).toHaveBeenCalled();
  });

  it('omits the empty-state action for viewers who cannot manage', () => {
    const { getByTestId, queryByText } = renderSection({ items: [], canManage: false });
    expect(getByTestId('checklist-empty')).toBeTruthy();
    expect(queryByText('Add an item')).toBeNull();
  });

  it('hides the empty state once the checklist has items', () => {
    const { queryByTestId, getByText } = renderSection({ items: [item('a', 'c1')] });
    expect(queryByTestId('checklist-empty')).toBeNull();
    expect(getByText('Item a')).toBeTruthy();
  });

  it('keeps the empty state when the only items belong to another checklist', () => {
    const { getByTestId } = renderSection({ items: [item('b', 'OTHER')] });
    expect(getByTestId('checklist-empty')).toBeTruthy();
  });
});
