import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { ALWAYS_ON, NOTIFICATION_CATEGORIES, type NotificationCategory } from '../utils/categories';

function Toggle({
  label,
  value,
  disabled,
  onToggle,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      className="flex-row items-center justify-between py-2"
    >
      <PixelText size="body" className={disabled ? 'text-text-secondary' : ''}>
        {label}
      </PixelText>
      <View
        className={`h-6 w-11 rounded-full border-2 border-border ${
          value ? 'bg-secondary-500' : 'bg-surface-alt'
        }`}
      />
    </Pressable>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const { prefs, save } = useNotificationPrefs();

  const setEnabled = () => save.mutate({ ...prefs, enabled: !prefs.enabled });
  const setQuiet = () => save.mutate({ ...prefs, quietHours: !prefs.quietHours });
  const setCategory = (c: NotificationCategory) =>
    save.mutate({
      ...prefs,
      categories: { ...prefs.categories, [c]: prefs.categories[c] === false },
    });

  return (
    <View className="gap-1">
      <PixelText size="h2" className="mb-2">
        {t('notifications.settings.title')}
      </PixelText>
      <Toggle
        label={t('notifications.settings.enabled')}
        value={prefs.enabled}
        onToggle={setEnabled}
      />
      <Toggle
        label={t('notifications.settings.quietHours')}
        value={prefs.quietHours}
        onToggle={setQuiet}
      />
      {NOTIFICATION_CATEGORIES.map((c) => (
        <Toggle
          key={c}
          label={t(`notifications.categories.${c}`)}
          value={prefs.categories[c] !== false}
          disabled={ALWAYS_ON.includes(c)}
          onToggle={() => setCategory(c)}
        />
      ))}
    </View>
  );
}
