import { fireEvent, render } from '@testing-library/react-native';

import { PixelChip } from './PixelChip';

describe('PixelChip', () => {
  it('renders label', () => {
    const { getByText } = render(<PixelChip label="Foodie" />);
    expect(getByText('Foodie')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PixelChip label="Tap" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes selected accessibility state', () => {
    const { getByRole } = render(<PixelChip label="X" onPress={() => {}} selected />);
    const btn = getByRole('button');
    expect(btn.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('does not render as button without onPress', () => {
    const { queryByRole } = render(<PixelChip label="Static" />);
    expect(queryByRole('button')).toBeNull();
  });
});
