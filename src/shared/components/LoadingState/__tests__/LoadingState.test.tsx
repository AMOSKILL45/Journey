import { render } from '@testing-library/react-native';

import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('renders a spinner variant by default with the label announced', () => {
    const { getByLabelText, getByText } = render(<LoadingState label="Loading…" />);
    expect(getByLabelText('Loading…')).toBeTruthy();
    expect(getByText('Loading…')).toBeTruthy();
  });

  it('marks the container busy for screen readers', () => {
    const { getByTestId } = render(<LoadingState label="Loading…" testID="ls" />);
    expect(getByTestId('ls').props.accessibilityState).toMatchObject({ busy: true });
  });

  it('renders skeleton rows when variant is skeleton', () => {
    const { getByTestId } = render(
      <LoadingState variant="skeleton" label="Loading…" testID="skel" />,
    );
    const container = getByTestId('skel');
    expect(container.props.accessibilityLabel).toBe('Loading…');
    // 4 reserved skeleton rows.
    expect(container.props.children.length).toBe(4);
  });
});
