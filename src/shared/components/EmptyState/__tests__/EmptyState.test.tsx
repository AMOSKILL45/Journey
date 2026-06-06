import { fireEvent, render } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title and body', () => {
    const { getByText } = render(<EmptyState title="No trips" body="Plan one" />);
    expect(getByText('No trips')).toBeTruthy();
    expect(getByText('Plan one')).toBeTruthy();
  });

  it('renders the action button and fires onAction', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="t" body="b" actionLabel="Create" onAction={onAction} />,
    );
    fireEvent.press(getByText('Create'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders no action when label or handler is missing', () => {
    const { queryByText } = render(<EmptyState title="t" body="b" actionLabel="Create" />);
    expect(queryByText('Create')).toBeNull();
  });

  it('exposes the sprite with an accessibility label', () => {
    const { getByLabelText } = render(
      <EmptyState title="t" body="b" spriteSource={{ uri: 'x' }} spriteLabel="Empty box" />,
    );
    expect(getByLabelText('Empty box')).toBeTruthy();
  });

  it('renders no image when no sprite is given', () => {
    const { queryByLabelText } = render(<EmptyState title="t" body="b" spriteLabel="nope" />);
    expect(queryByLabelText('nope')).toBeNull();
  });
});
