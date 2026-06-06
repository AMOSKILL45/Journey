import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, PixelRatio } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** System font scale at or above which Readable Mode auto-engages (ADR-011). */
const READABLE_MODE_AUTO_FONT_SCALE = 1.5;

interface FeedbackState {
  sfxEnabled: boolean;
  uiSoundsEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  hapticsEnabled: boolean;
  osReduceMotion: boolean;
  /** User-controlled Readable Mode toggle (persisted). */
  readableModeManual: boolean;
  /** Auto-engaged Readable Mode from large system font scale (seeded once at start, not persisted). */
  readableModeAuto: boolean;
  setSfx: (v: boolean) => void;
  setUiSounds: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  setVolume: (v: number) => void;
  setHaptics: (v: boolean) => void;
  setOsReduceMotion: (v: boolean) => void;
  setReadableModeManual: (v: boolean) => void;
  setReadableModeAuto: (v: boolean) => void;
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
      readableModeManual: false,
      readableModeAuto: false,
      setSfx: (v) => set({ sfxEnabled: v }),
      setUiSounds: (v) => set({ uiSoundsEnabled: v }),
      setMusic: (v) => set({ musicEnabled: v }),
      setVolume: (v) => set({ masterVolume: v }),
      setHaptics: (v) => set({ hapticsEnabled: v }),
      setOsReduceMotion: (v) => set({ osReduceMotion: v }),
      setReadableModeManual: (v) => set({ readableModeManual: v }),
      setReadableModeAuto: (v) => set({ readableModeAuto: v }),
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
        readableModeManual: s.readableModeManual,
      }),
    },
  ),
);

/**
 * Seed + subscribe to the OS Reduce Motion setting, and seed Readable Mode auto
 * from the system font scale (≥1.5 → on). Returns an unsubscribe.
 */
export function initReduceMotion(): () => void {
  void AccessibilityInfo.isReduceMotionEnabled().then((v) =>
    useFeedbackSettings.getState().setOsReduceMotion(v),
  );
  const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
    useFeedbackSettings.getState().setOsReduceMotion(v),
  );

  const fontScale = PixelRatio.getFontScale();
  useFeedbackSettings.getState().setReadableModeAuto(fontScale >= READABLE_MODE_AUTO_FONT_SCALE);

  return () => sub.remove();
}

/** Effective Readable Mode: manual user toggle OR auto-engaged by large font scale. */
export function useReadableMode(): boolean {
  return useFeedbackSettings((s) => s.readableModeManual || s.readableModeAuto);
}
