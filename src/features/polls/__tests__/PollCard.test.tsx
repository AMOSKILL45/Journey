import { fireEvent, render } from '@testing-library/react-native';

import { t } from '@core/i18n';

import type { Poll, PollVote } from '../api';
import { PollCard } from '../components/PollCard';
import { GHOST_AUTHOR_ID } from '../data/ghostAuthor';

const basePoll = {
  id: 'p1',
  trip_id: 't1',
  milestone_id: null,
  question: 'Where to eat?',
  options: [
    { id: 'opt1', label: 'Pizza' },
    { id: 'opt2', label: 'Sushi' },
  ],
  created_by: 'u1',
  expires_at: null,
  closed_at: null,
  created_at: '2026-06-05T00:00:00Z',
} as unknown as Poll;

function votes(...rows: [string, string][]): PollVote[] {
  return rows.map(([user_id, option_id]) => ({
    poll_id: 'p1',
    user_id,
    option_id,
    voted_at: '2026-06-05T01:00:00Z',
  }));
}

describe('PollCard', () => {
  it('renders the question and all option labels', () => {
    const { getByText } = render(
      <PollCard
        poll={basePoll}
        votes={[]}
        myUserId="me"
        canManage={false}
        onVote={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByText('Where to eat?')).toBeTruthy();
    expect(getByText('Pizza')).toBeTruthy();
    expect(getByText('Sushi')).toBeTruthy();
  });

  it('fires onVote with the option id when an open option is tapped', () => {
    const onVote = jest.fn();
    const { getByLabelText } = render(
      <PollCard
        poll={basePoll}
        votes={[]}
        myUserId="me"
        canManage={false}
        onVote={onVote}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Sushi'));
    expect(onVote).toHaveBeenCalledWith('opt2');
  });

  it('marks the caller’s chosen option as selected', () => {
    const { getByLabelText } = render(
      <PollCard
        poll={basePoll}
        votes={votes(['me', 'opt1'], ['u2', 'opt2'])}
        myUserId="me"
        canManage={false}
        onVote={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Pizza').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('Sushi').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('does not call onVote on a closed poll (options are not buttons)', () => {
    const onVote = jest.fn();
    const closed = { ...basePoll, closed_at: '2026-06-05T02:00:00Z' } as Poll;
    const { queryByLabelText } = render(
      <PollCard
        poll={closed}
        votes={votes(['u2', 'opt1'])}
        myUserId="me"
        canManage
        onVote={onVote}
        onClose={jest.fn()}
      />,
    );
    // On a closed poll the option label is plain text, not a pressable with that a11y label.
    expect(queryByLabelText('Pizza')).toBeNull();
  });

  it('renders an author byline with an accessibility label', () => {
    const { getByLabelText } = render(
      <PollCard
        poll={basePoll}
        votes={[]}
        myUserId="me"
        authorName="Sam"
        canManage={false}
        onVote={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText(t('documents.uploadedBy', { name: 'Sam' }))).toBeTruthy();
  });

  it('shows the ghost author name for a deleted author', () => {
    // PollsSection resolves a sentinel created_by to t('account.ghostName') before
    // passing authorName down; the card renders whatever resolved string it is given.
    const ghostName = t('account.ghostName');
    const ghostPoll = { ...basePoll, created_by: GHOST_AUTHOR_ID } as Poll;
    const { getByLabelText } = render(
      <PollCard
        poll={ghostPoll}
        votes={[]}
        myUserId="me"
        authorName={ghostName}
        canManage={false}
        onVote={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText(t('documents.uploadedBy', { name: ghostName }))).toBeTruthy();
  });

  it('omits the byline when no author name is provided', () => {
    const { queryByLabelText } = render(
      <PollCard
        poll={basePoll}
        votes={[]}
        myUserId="me"
        canManage={false}
        onVote={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(queryByLabelText(t('documents.uploadedBy', { name: 'Sam' }))).toBeNull();
  });

  it('shows a close affordance only for managers on an open poll', () => {
    const onClose = jest.fn();
    const { getByTestId, rerender, queryByTestId } = render(
      <PollCard
        poll={basePoll}
        votes={[]}
        myUserId="me"
        canManage
        onVote={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByTestId('poll-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <PollCard
        poll={basePoll}
        votes={[]}
        myUserId="me"
        canManage={false}
        onVote={jest.fn()}
        onClose={onClose}
      />,
    );
    expect(queryByTestId('poll-close')).toBeNull();
  });
});
