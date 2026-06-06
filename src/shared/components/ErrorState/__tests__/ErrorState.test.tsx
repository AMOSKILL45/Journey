import { fireEvent, render } from '@testing-library/react-native';

import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders title, body and a retry button', () => {
    const { getByText } = render(
      <ErrorState title="Oops" body="It broke" onRetry={jest.fn()} retryLabel="Retry" />,
    );
    expect(getByText('Oops')).toBeTruthy();
    expect(getByText('It broke')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('fires onRetry when the retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <ErrorState title="t" body="b" onRetry={onRetry} retryLabel="Retry" />,
    );
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falls back to the common.retry key when no label is given', () => {
    const { getByText } = render(<ErrorState title="t" body="b" onRetry={jest.fn()} />);
    // i18n is mocked to English in jest.setup → common.retry = "Retry".
    expect(getByText('Retry')).toBeTruthy();
  });

  it('is an alert live region for screen readers', () => {
    const { getByTestId } = render(
      <ErrorState title="t" body="b" onRetry={jest.fn()} testID="es" />,
    );
    const container = getByTestId('es');
    expect(container.props.accessibilityRole).toBe('alert');
    expect(container.props.accessibilityLiveRegion).toBe('polite');
  });
});
