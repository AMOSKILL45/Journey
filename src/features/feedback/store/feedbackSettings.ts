import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FeedbackState {
  sfxEnabled: boolean;
  uiSoundsEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  hapticsEnabled: boolean;
  osReduceMotion: boolean;
  setSfx: (v: boolean) => void;
  setUiSounds: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  setVolume: (v: number) => void;
  setHaptics: (v: boolean) => void;
  setOsReduceMotion: (v: boolean) => void;
}

export const useFeedbackSettings = create<FeedbackState>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      uiSoundsEnabled: false,
      musicEnabled: false,
      masterVolume: 0.6,
      hapticsEnabled: true,
      osReduceMotion: false,
      setSfx: (v) => set({ sfxEnabled: v }),
      setUiSounds: (v) => set({ uiSoundsEnabled: v }),
      setMusic: (v) => set({ musicEnabled: v }),
      setVolume: (v) => set({ masterVolume: v }),
      setHaptics: (v) => set({ hapticsEnabled: v }),
      setOsReduceMotion: (v) => set({ osReduceMotion: v }),
    }),
    {
      name: 'feedback.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        sfxEnabled: s.sfxEnabled,
        uiSoundsEnabled: s.uiSoundsEnabled,
        musicEnabled: s.musicEnabled,
        masterVolume: s.masterVolume,
        hapticsEnabled: s.hapticsEnabled,
      }),
    },
  ),
);

/** Seed + subscribe to the OS Reduce Motion accessibility setting. Returns an unsubscribe. */
export function initReduceMotion(): () => void {
  void AccessibilityInfo.isReduceMotionEnabled().then((v) =>
    useFeedbackSettings.getState().setOsReduceMotion(v),
  );
  const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
    useFeedbackSettings.getState().setOsReduceMotion(v),
  );
  return () => sub.remove();
}
