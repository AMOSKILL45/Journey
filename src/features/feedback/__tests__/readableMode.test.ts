import { PixelRatio } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { initReduceMotion, useFeedbackSettings, useReadableMode } from '../store/feedbackSettings';

const reset = () =>
  useFeedbackSettings.setState({ readableModeManual: false, readableModeAuto: false });

describe('Readable Mode (feedback store)', () => {
  beforeEach(reset);

  it('defaults to off', () => {
    const s = useFeedbackSettings.getState();
    expect(s.readableModeManual).toBe(false);
    expect(s.readableModeAuto).toBe(false);
    const { result } = renderHook(() => useReadableMode());
    expect(result.current).toBe(false);
  });

  it('engages when the manual toggle is on', () => {
    useFeedbackSettings.setState({ readableModeManual: true, readableModeAuto: false });
    const { result } = renderHook(() => useReadableMode());
    expect(result.current).toBe(true);
  });

  it('engages when the auto flag is on (manual off)', () => {
    useFeedbackSettings.setState({ readableModeManual: false, readableModeAuto: true });
    const { result } = renderHook(() => useReadableMode());
    expect(result.current).toBe(true);
  });

  it('seeds readableModeAuto from a large system font scale (>=1.5)', () => {
    const spy = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.5);
    const unsub = initReduceMotion();
    expect(useFeedbackSettings.getState().readableModeAuto).toBe(true);
    unsub();
    spy.mockRestore();
  });

  it('leaves readableModeAuto off at a normal font scale (<1.5)', () => {
    const spy = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.0);
    const unsub = initReduceMotion();
    expect(useFeedbackSettings.getState().readableModeAuto).toBe(false);
    unsub();
    spy.mockRestore();
  });

  it('setters update both readable-mode flags', () => {
    useFeedbackSettings.getState().setReadableModeManual(true);
    useFeedbackSettings.getState().setReadableModeAuto(true);
    const s = useFeedbackSettings.getState();
    expect(s.readableModeManual).toBe(true);
    expect(s.readableModeAuto).toBe(true);
  });
});
