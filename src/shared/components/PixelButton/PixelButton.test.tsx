import { fireEvent, render } from '@testing-library/react-native';

import { PixelButton } from './PixelButton';

describe('PixelButton', () => {
  it('renders label', () => {
    const { getByText } = render(<PixelButton>Tap me</PixelButton>);
    expect(getByText('Tap me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PixelButton onPress={onPress}>Press</PixelButton>);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PixelButton onPress={onPress} disabled>
        Press
      </PixelButton>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PixelButton onPress={onPress} loading>
        Press
      </PixelButton>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sets busy accessibilityState when loading', () => {
    const { getByRole } = render(<PixelButton loading>Loading</PixelButton>);
    const btn = getByRole('button');
    expect(btn.props.accessibilityState).toMatchObject({ busy: true });
  });
});
