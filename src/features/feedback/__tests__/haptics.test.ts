import * as Haptics from 'expo-haptics';

import { useFeedbackSettings } from '../store/feedbackSettings';
import { haptics } from '../haptics';

// expo-haptics is globally mocked in jest.setup.js; assert against those jest.fns.
const impactAsync = jest.mocked(Haptics.impactAsync);
const notificationAsync = jest.mocked(Haptics.notificationAsync);

describe('haptics', () => {
  beforeEach(() => {
    impactAsync.mockClear();
    notificationAsync.mockClear();
    useFeedbackSettings.setState({ hapticsEnabled: true, osReduceMotion: false });
  });

  it('fires the mapped feedback when enabled', () => {
    haptics.light();
    haptics.success();
    expect(impactAsync).toHaveBeenCalledWith('light');
    expect(notificationAsync).toHaveBeenCalledWith('success');
  });

  it('no-ops when haptics disabled', () => {
    useFeedbackSettings.setState({ hapticsEnabled: false });
    haptics.medium();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  it('no-ops when OS reduce-motion is on', () => {
    useFeedbackSettings.setState({ osReduceMotion: true });
    haptics.error();
    expect(notificationAsync).not.toHaveBeenCalled();
  });
});
