const mockPlay = jest.fn();
const mockCreateAudioPlayer = jest.fn(() => ({
  play: mockPlay,
  volume: 0,
  loop: false,
  remove: jest.fn(),
}));
jest.mock('expo-audio', () => ({ createAudioPlayer: mockCreateAudioPlayer }));
jest.mock('../soundManifest', () => ({
  SOUND_IDS: ['coin_unlock'],
  SOUND_CATEGORY: { coin_unlock: 'event' },
  soundAssets: { coin_unlock: 1 },
}));

import { useFeedbackSettings } from '../store/feedbackSettings';
import { playSfx, setAudioSuppressed } from '../sound';

describe('sound.playSfx', () => {
  beforeEach(() => {
    mockCreateAudioPlayer.mockClear();
    mockPlay.mockClear();
    setAudioSuppressed(false);
    useFeedbackSettings.setState({ sfxEnabled: true, masterVolume: 0.6, uiSoundsEnabled: false });
  });

  it('plays an event sound when enabled', () => {
    playSfx('coin_unlock');
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(1);
    expect(mockPlay).toHaveBeenCalled();
  });

  it('no-ops when the category is disabled', () => {
    useFeedbackSettings.setState({ sfxEnabled: false });
    playSfx('coin_unlock');
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  it('no-ops while audio is suppressed (sensitive flow)', () => {
    setAudioSuppressed(true);
    playSfx('coin_unlock');
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });
});
