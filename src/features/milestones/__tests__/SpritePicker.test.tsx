import { fireEvent, render } from '@testing-library/react-native';

import { MILESTONE_SPRITES } from '@assets/sprites/milestones/manifest';

jest.mock('expo-image', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.View };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { SpritePicker } from '../components/SpritePicker';

describe('SpritePicker', () => {
  it('renders all sprites by default', () => {
    const { getAllByRole } = render(
      <SpritePicker visible selectedSpriteId={null} onSelect={jest.fn()} onClose={jest.fn()} />,
    );
    const sprites = getAllByRole('button').filter((node) =>
      MILESTONE_SPRITES.some((s) => s.label === node.props.accessibilityLabel),
    );
    expect(sprites.length).toBe(MILESTONE_SPRITES.length);
  });

  it('calls onSelect with sprite id when tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <SpritePicker visible selectedSpriteId={null} onSelect={onSelect} onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Red Castle'));
    expect(onSelect).toHaveBeenCalledWith('milestones/castle_red');
  });

  it('filters by category', () => {
    const { getByLabelText, queryByLabelText } = render(
      <SpritePicker
        visible
        selectedSpriteId={null}
        initialCategory="food"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Pizza')).toBeTruthy();
    // a sprite from another category should not be in the grid
    expect(queryByLabelText('Airplane')).toBeNull();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <SpritePicker
        visible={false}
        selectedSpriteId={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(queryByText('Pick a sprite')).toBeNull();
  });
});
