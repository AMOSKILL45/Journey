import { render } from '@testing-library/react-native';
import { createRef } from 'react';

import type { ScrapbookCardHandle } from '../components/ScrapbookCard';
import { ScrapbookCard } from '../components/ScrapbookCard';
import type { TripStats } from '../utils/stats';

// Mock Skia so the canvas branch renders in jest (the real package is a native binding the
// lazy require() can't load). Each primitive becomes a host <Text> carrying its props so we can
// assert wiring; the canvas ref exposes a makeImageSnapshot() that returns a fixed base64.
const mockSnapshot = jest.fn(() => ({ encodeToBase64: () => 'BASE64PNG' }));

jest.mock('@shopify/react-native-skia', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  const stub =
    (name: string) =>
    // eslint-disable-next-line react/display-name
    ({ text, children }: { text?: string; children?: unknown }) =>
      React.createElement(Text, { accessibilityLabel: name }, text ?? (children as never) ?? null);
  return {
    Canvas: ({ children }: { children?: unknown }) => React.createElement(Text, null, children),
    Group: ({ children }: { children?: unknown }) => React.createElement(Text, null, children),
    Fill: stub('Fill'),
    Rect: stub('Rect'),
    RoundedRect: stub('RoundedRect'),
    Circle: stub('Circle'),
    Image: stub('Image'),
    Text: stub('Text'),
    LinearGradient: stub('LinearGradient'),
    vec: (x: number, y: number) => ({ x, y }),
    matchFont: () => ({}),
    useCanvasRef: () => ({ current: { makeImageSnapshot: mockSnapshot } }),
    ImageFormat: { PNG: 4 },
  };
});

const stats: TripStats = { distanceM: 2500, countries: 3, days: 5, checkins: 4 };

describe('ScrapbookCard', () => {
  beforeEach(() => mockSnapshot.mockClear());

  it('renders the title and the formatted stat values without crashing', () => {
    const { getByText, queryAllByText } = render(
      <ScrapbookCard
        title="Road trip"
        stats={stats}
        milestones={[
          { id: 'm1', isBoss: false },
          { id: 'm2', isBoss: true },
        ]}
        photoCount={2}
      />,
    );

    // Title is drawn.
    expect(getByText('Road trip')).toBeTruthy();
    // Distance is formatted to km and present on the card.
    expect(queryAllByText('3 km').length).toBeGreaterThan(0);
    // Countries / days / checkins values are present.
    expect(queryAllByText('3').length).toBeGreaterThan(0);
    expect(queryAllByText('5').length).toBeGreaterThan(0);
    expect(queryAllByText('4').length).toBeGreaterThan(0);
  });

  it('exposes renderToPngBase64() via the imperative handle, driving makeImageSnapshot', () => {
    const ref = createRef<ScrapbookCardHandle>();
    render(
      <ScrapbookCard
        ref={ref}
        title="Trip"
        stats={stats}
        milestones={[{ id: 'm1', isBoss: false }]}
        photoCount={0}
      />,
    );

    const out = ref.current?.renderToPngBase64();
    expect(out).toBe('BASE64PNG');
    expect(mockSnapshot).toHaveBeenCalledTimes(1);
  });
});
