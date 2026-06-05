import { render } from '@testing-library/react-native';

jest.mock('@core/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'distance.legLabel' ? `${opts?.distance} · ${opts?.duration}` : key,
  }),
}));

import { DistancePill } from '../DistancePill';

describe('DistancePill', () => {
  it('renders "distance · duration" in metric by default', () => {
    const { getByText } = render(<DistancePill distanceM={120_000} durationS={5_400} />);
    expect(getByText('120 km · 1h30')).toBeTruthy();
  });

  it('honors the imperial unit', () => {
    const { getByText } = render(
      <DistancePill distanceM={120_700} durationS={2_700} unit="imperial" />,
    );
    expect(getByText('75 mi · 45 min')).toBeTruthy();
  });

  it('exposes an accessibility label with both parts', () => {
    const { getByTestId } = render(<DistancePill distanceM={5_000} durationS={600} testID="dp" />);
    expect(getByTestId('dp').props.accessibilityLabel).toBe('5 km · 10 min');
  });
});
