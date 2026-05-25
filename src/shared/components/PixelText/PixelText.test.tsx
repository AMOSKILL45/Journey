import { render } from '@testing-library/react-native';

import { PixelText } from './PixelText';

describe('PixelText', () => {
  it('renders children text', () => {
    const { getByText } = render(<PixelText>Hello</PixelText>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies size classes based on prop', () => {
    const { getByText } = render(<PixelText size="h1">Title</PixelText>);
    const element = getByText('Title');
    expect(element.props.className).toContain('text-h1');
  });

  it('applies explicit family override', () => {
    const { getByText } = render(
      <PixelText size="body" family="pixel">
        Mixed
      </PixelText>,
    );
    const element = getByText('Mixed');
    expect(element.props.className).toContain('font-pixel');
  });

  it('has accessibility role text by default', () => {
    const { getByText } = render(<PixelText>Accessible</PixelText>);
    const element = getByText('Accessible');
    expect(element.props.accessibilityRole).toBe('text');
  });
});
