import { fireEvent, render } from '@testing-library/react-native';

import { A11ySettings } from '../components/A11ySettings';
import { useFeedbackSettings } from '../store/feedbackSettings';

const reset = () => useFeedbackSettings.setState({ readableModeManual: false });

describe('A11ySettings', () => {
  beforeEach(reset);

  it('renders the Readable Mode toggle with label + description (i18n)', () => {
    const { getByLabelText, getByText } = render(<A11ySettings />);
    // English copy from the locale (jest mocks locale to en).
    expect(getByLabelText('Readable text')).toBeTruthy();
    expect(getByText('Swap the pixel font for an easier-to-read one across the app.')).toBeTruthy();
  });

  it('reflects the current store value via accessibilityState', () => {
    useFeedbackSettings.setState({ readableModeManual: true });
    const { getByLabelText } = render(<A11ySettings />);
    expect(getByLabelText('Readable text').props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('toggles readableModeManual on press', () => {
    const { getByLabelText } = render(<A11ySettings />);
    fireEvent.press(getByLabelText('Readable text'));
    expect(useFeedbackSettings.getState().readableModeManual).toBe(true);
  });
});
