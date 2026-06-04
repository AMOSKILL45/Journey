import * as Haptics from 'expo-haptics';

import { useFeedbackSettings } from './store/feedbackSettings';

function on(): boolean {
  const s = useFeedbackSettings.getState();
  return s.hapticsEnabled && !s.osReduceMotion;
}

export const haptics = {
  light: () => {
    if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  selection: () => {
    if (on()) void Haptics.selectionAsync();
  },
  medium: () => {
    if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success: () => {
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error: () => {
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
