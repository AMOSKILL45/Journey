import { useFeedbackSettings } from '../store/feedbackSettings';

const reset = () =>
  useFeedbackSettings.setState({
    sfxEnabled: true,
    uiSoundsEnabled: false,
    musicEnabled: false,
    masterVolume: 0.6,
    hapticsEnabled: true,
    osReduceMotion: false,
  });

describe('feedbackSettings', () => {
  beforeEach(reset);

  it('has the spec defaults', () => {
    const s = useFeedbackSettings.getState();
    expect(s.sfxEnabled).toBe(true);
    expect(s.uiSoundsEnabled).toBe(false);
    expect(s.musicEnabled).toBe(false);
    expect(s.masterVolume).toBe(0.6);
    expect(s.hapticsEnabled).toBe(true);
  });

  it('setters update fields', () => {
    useFeedbackSettings.getState().setSfx(false);
    useFeedbackSettings.getState().setVolume(0.25);
    useFeedbackSettings.getState().setHaptics(false);
    const s = useFeedbackSettings.getState();
    expect(s.sfxEnabled).toBe(false);
    expect(s.masterVolume).toBe(0.25);
    expect(s.hapticsEnabled).toBe(false);
  });
});
