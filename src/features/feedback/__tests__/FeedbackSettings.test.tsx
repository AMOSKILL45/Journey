import { fireEvent, render } from '@testing-library/react-native';

import { FeedbackSettings } from '../components/FeedbackSettings';
import { useFeedbackSettings } from '../store/feedbackSettings';

describe('FeedbackSettings', () => {
  beforeEach(() =>
    useFeedbackSettings.setState({ sfxEnabled: true, masterVolume: 0.6, hapticsEnabled: true }),
  );

  it('toggles sfx via the store', () => {
    const { getByLabelText } = render(<FeedbackSettings />);
    fireEvent.press(getByLabelText('Sound effects')); // jest loads real en.json (6A convention)
    expect(useFeedbackSettings.getState().sfxEnabled).toBe(false);
  });

  it('sets volume via a step', () => {
    const { getByTestId } = render(<FeedbackSettings />);
    fireEvent.press(getByTestId('vol-0.25'));
    expect(useFeedbackSettings.getState().masterVolume).toBe(0.25);
  });
});
