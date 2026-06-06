import { act, fireEvent, render } from '@testing-library/react-native';

import { ChecklistScreen } from '../screens/ChecklistScreen';

/** Flush the screen's async getUser/ensureDefaultChecklist effects. */
const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ tripId: 't1' }),
}));
jest.mock('@core/supabase/client', () => ({
  supabase: { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) } },
}));
jest.mock('../api/checklists', () => ({ ensureDefaultChecklist: () => Promise.resolve() }));
jest.mock('@features/trips/hooks/useTripMembers', () => ({ useTripMembers: () => ({ data: [] }) }));
jest.mock('../hooks/useReadiness', () => ({
  useReadiness: () => ({ input: { items: [], completionsByItem: {}, travelerIds: [] } }),
}));
jest.mock('../components/ChecklistPicker', () => ({ ChecklistPicker: () => null }));
jest.mock('../components/ChecklistSection', () => ({ ChecklistSection: () => null }));

type ListsState = {
  data?: unknown[];
  refetch: jest.Mock;
  isLoading: boolean;
  isError: boolean;
};
let mockListsState: ListsState;

jest.mock('../hooks/useChecklist', () => ({
  useChecklists: () => mockListsState,
  useChecklistItems: () => ({ data: [] }),
  useCompletions: () => ({ data: [] }),
}));

beforeEach(() => {
  mockListsState = { data: [], refetch: jest.fn(), isLoading: false, isError: false };
});

describe('ChecklistScreen states', () => {
  it('shows the loading skeleton while the checklists load', async () => {
    mockListsState = { data: [], refetch: jest.fn(), isLoading: true, isError: false };
    const { getByTestId } = render(<ChecklistScreen />);
    expect(getByTestId('checklist-loading')).toBeTruthy();
    await flush();
  });

  it('shows the error state and retries on press', async () => {
    mockListsState = { data: [], refetch: jest.fn(), isLoading: false, isError: true };
    const { getByTestId, getByText } = render(<ChecklistScreen />);
    expect(getByTestId('checklist-error').props.accessibilityRole).toBe('alert');
    fireEvent.press(getByText('Retry'));
    expect(mockListsState.refetch).toHaveBeenCalled();
    await flush();
  });
});
