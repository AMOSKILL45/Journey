import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { PrePermissionProvider } from '../components/PrePermissionProvider';
import { __resetPrePermissionForTests, requestPrePermission } from '../prePermission';

// Render the sheet children inline and make the ref's open/close no-ops so we
// can drive the Allow / Not-now buttons directly. `onChange(-1)` (pan-to-close)
// is not auto-fired by this mock; the Provider's "Not now" button covers dismiss.
// Everything is required INSIDE the factory (jest.mock can't close over imports).
jest.mock('@shared/components/PixelBottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = React.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ open: jest.fn(), close: jest.fn() }));
      return <View>{children}</View>;
    },
  );
  Mock.displayName = 'PixelBottomSheet';
  return { PixelBottomSheet: Mock };
});

describe('PrePermissionProvider', () => {
  beforeEach(() => {
    __resetPrePermissionForTests();
  });

  it('does not render kind-specific copy until a request comes in', () => {
    const { queryByText } = render(<PrePermissionProvider />);
    expect(queryByText('Stay in the loop')).toBeNull();
  });

  it('opens the sheet for the requested kind and resolves true on Allow', async () => {
    const { getByTestId, findByText } = render(<PrePermissionProvider />);

    let resolved: boolean | undefined;
    act(() => {
      void requestPrePermission('notifications').then((v) => {
        resolved = v;
      });
    });

    expect(await findByText('Stay in the loop')).toBeTruthy();
    fireEvent.press(getByTestId('pre-permission-allow'));
    await waitFor(() => expect(resolved).toBe(true));
  });

  it('resolves false when the user taps "Not now"', async () => {
    const { getByTestId, findByText } = render(<PrePermissionProvider />);

    let resolved: boolean | undefined;
    act(() => {
      void requestPrePermission('location').then((v) => {
        resolved = v;
      });
    });

    expect(await findByText('Travel together, live')).toBeTruthy();
    fireEvent.press(getByTestId('pre-permission-not-now'));
    await waitFor(() => expect(resolved).toBe(false));
  });
});
