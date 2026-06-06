import { render } from '@testing-library/react-native';

import { t } from '@core/i18n';

import { GHOST_USER_ID } from '../utils/sentinel';

// Mock the data hook so the component renders against fixed query states.
const mockUseTripMembers = jest.fn();
jest.mock('../hooks/useTripMembers', () => ({
  useTripMembers: (tripId: string) => mockUseTripMembers(tripId),
}));

import { MembersList } from '../components/MembersList';

const member = (over: Record<string, unknown> = {}) => ({
  trip_id: 't1',
  user_id: 'u1',
  role: 'editor',
  profile: { display_name: 'Ana', avatar_sprite_id: 's1', avatar_color: '#2A9D8F' },
  ...over,
});

describe('MembersList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders a skeleton loading state while members load', () => {
    mockUseTripMembers.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { getByLabelText } = render(<MembersList tripId="t1" />);
    expect(getByLabelText(t('common.loading'))).toBeTruthy();
  });

  it('announces an error (alert) when the members query fails', () => {
    mockUseTripMembers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });
    const { getByText } = render(<MembersList tripId="t1" />);
    expect(getByText(t('common.error'))).toBeTruthy();
  });

  it('shows the empty copy when there are no members', () => {
    mockUseTripMembers.mockReturnValue({ data: [], isLoading: false, error: null });
    const { getByText } = render(<MembersList tripId="t1" />);
    expect(getByText(t('trips.members.empty'))).toBeTruthy();
  });

  it('renders a member display name and role', () => {
    mockUseTripMembers.mockReturnValue({ data: [member()], isLoading: false, error: null });
    const { getByText, getByLabelText } = render(<MembersList tripId="t1" />);
    expect(getByText('Ana')).toBeTruthy();
    // The whole row is one labelled a11y node: "<name>, <role>".
    expect(getByLabelText('Ana, editor')).toBeTruthy();
  });

  it('falls back to the anonymous label when a member has no profile', () => {
    mockUseTripMembers.mockReturnValue({
      data: [member({ user_id: 'u2', profile: null })],
      isLoading: false,
      error: null,
    });
    const { getByText } = render(<MembersList tripId="t1" />);
    expect(getByText(t('profile.anonymous'))).toBeTruthy();
  });

  it('shows the ghost name for the reserved deleted-user sentinel id', () => {
    mockUseTripMembers.mockReturnValue({
      data: [member({ user_id: GHOST_USER_ID, role: 'viewer', profile: null })],
      isLoading: false,
      error: null,
    });
    const { getByText, queryByText } = render(<MembersList tripId="t1" />);
    expect(getByText(t('account.ghostName'))).toBeTruthy();
    // It must NOT fall through to the generic anonymous label.
    expect(queryByText(t('profile.anonymous'))).toBeNull();
  });
});
