import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { PrePermissionSheet } from '../components/PrePermissionSheet';

// The real PixelBottomSheet wraps @gorhom/bottom-sheet (needs a portal + gesture
// host). For a unit test of the sheet's CONTENT we render children directly.
jest.mock('@shared/components/PixelBottomSheet', () => {
  const { View } = require('react-native');
  return {
    PixelBottomSheet: ({ children }: { children: ReactNode }) => <View>{children}</View>,
  };
});

describe('PrePermissionSheet', () => {
  it('renders the notifications priming copy', () => {
    const { getByText } = render(
      <PrePermissionSheet kind="notifications" onAllow={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Stay in the loop')).toBeTruthy();
    expect(getByText(/only when it matters/)).toBeTruthy();
  });

  it('renders the location priming copy', () => {
    const { getByText } = render(
      <PrePermissionSheet kind="location" onAllow={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Travel together, live')).toBeTruthy();
    expect(getByText(/You control this anytime/)).toBeTruthy();
  });

  it('Allow fires onAllow with an accessibility label', () => {
    const onAllow = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <PrePermissionSheet kind="notifications" onAllow={onAllow} onDismiss={jest.fn()} />,
    );
    expect(getByLabelText('Allow')).toBeTruthy();
    fireEvent.press(getByTestId('pre-permission-allow'));
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it('Not now fires onDismiss with an accessibility label', () => {
    const onDismiss = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <PrePermissionSheet kind="location" onAllow={jest.fn()} onDismiss={onDismiss} />,
    );
    expect(getByLabelText('Not now')).toBeTruthy();
    fireEvent.press(getByTestId('pre-permission-not-now'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders no kind-specific copy when closed (kind = null)', () => {
    const { queryByText } = render(
      <PrePermissionSheet kind={null} onAllow={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(queryByText('Stay in the loop')).toBeNull();
    expect(queryByText('Travel together, live')).toBeNull();
  });
});
