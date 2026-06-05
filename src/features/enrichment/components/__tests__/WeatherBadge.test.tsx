import { render } from '@testing-library/react-native';

// Deterministic t(): the enrichment i18n namespace is merged into the central locale by the
// orchestrator at integration time, so unit tests stub translation to stay self-contained.
jest.mock('@core/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'weather.temperature' ? `${opts?.value}°` : key,
  }),
}));

// expo-image renders an <Image>; stub to a plain RN component for the test renderer.
jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: View };
});

import { WeatherBadge } from '../WeatherBadge';

describe('WeatherBadge', () => {
  it('renders the rounded temperature', () => {
    const { getByText } = render(<WeatherBadge weatherCode={0} temperatureC={21.4} />);
    expect(getByText('21°')).toBeTruthy();
  });

  it('rounds the temperature to a whole degree', () => {
    const { getByText } = render(<WeatherBadge weatherCode={3} temperatureC={-2.6} />);
    expect(getByText('-3°')).toBeTruthy();
  });

  it('exposes a condition + temperature accessibility label', () => {
    const { getByTestId } = render(<WeatherBadge weatherCode={61} temperatureC={12} testID="wb" />);
    const node = getByTestId('wb');
    expect(node.props.accessibilityLabel).toContain('weather.rain');
    expect(node.props.accessibilityLabel).toContain('12°');
  });
});
