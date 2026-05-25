import { fireEvent, render } from '@testing-library/react-native';

import { PixelText } from '../PixelText';

import { PixelCard } from './PixelCard';

describe('PixelCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <PixelCard>
        <PixelText>Inside card</PixelText>
      </PixelCard>,
    );
    expect(getByText('Inside card')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PixelCard onPress={onPress} accessibilityLabel="test-card">
        <PixelText>Tap</PixelText>
      </PixelCard>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render as button without onPress', () => {
    const { queryByRole } = render(
      <PixelCard>
        <PixelText>No press</PixelText>
      </PixelCard>,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
