import { useFeedbackSettings } from '@features/feedback/store/feedbackSettings';
import { render } from '@testing-library/react-native';

import { PixelText } from './PixelText';

const setReadable = (manual: boolean, auto = false) =>
  useFeedbackSettings.setState({ readableModeManual: manual, readableModeAuto: auto });

describe('PixelText', () => {
  beforeEach(() => setReadable(false, false));

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

  describe('Readable Mode bascule (ADR-011)', () => {
    it('keeps pixel font when Readable Mode is off', () => {
      const { getByText } = render(<PixelText family="pixel">Pix</PixelText>);
      expect(getByText('Pix').props.className).toContain('font-pixel');
    });

    it('remaps pixel -> heading-bold when Readable Mode is on (manual)', () => {
      setReadable(true);
      const { getByText } = render(<PixelText family="pixel">Pix</PixelText>);
      const cls = getByText('Pix').props.className;
      expect(cls).toContain('font-heading-bold');
      expect(cls).not.toContain('font-pixel');
    });

    it('remaps the implicit pixel default (size="pixel") when Readable Mode is on', () => {
      setReadable(true);
      const { getByText } = render(<PixelText size="pixel">Auto</PixelText>);
      expect(getByText('Auto').props.className).toContain('font-heading-bold');
    });

    it('engages via the auto (font-scale) flag too', () => {
      setReadable(false, true);
      const { getByText } = render(<PixelText family="pixel">Pix</PixelText>);
      expect(getByText('Pix').props.className).toContain('font-heading-bold');
    });

    it('leaves non-pixel families untouched under Readable Mode', () => {
      setReadable(true);
      const { getByText } = render(
        <PixelText size="body" family="body">
          Body
        </PixelText>,
      );
      const cls = getByText('Body').props.className;
      expect(cls).toContain('font-body');
      expect(cls).not.toContain('font-heading-bold');
    });
  });
});
