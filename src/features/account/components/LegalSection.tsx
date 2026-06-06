import * as Linking from 'expo-linking';
import { Pressable, View } from 'react-native';

import { env } from '@core/env';
import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

/** Only http/https URLs may be handed to `Linking.openURL` (defensive — env values are trusted
 * https placeholders, but re-validating keeps an unexpected/forged value out of the open sink). */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function LegalLinkRow({ label, url }: { label: string; url: string }) {
  const onPress = (): void => {
    if (isHttpUrl(url)) void Linking.openURL(url);
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="min-h-[44px] flex-row items-center justify-between py-2"
    >
      <PixelText size="body">{label}</PixelText>
      <PixelText size="body" className="text-text-secondary">
        {'›'}
      </PixelText>
    </Pressable>
  );
}

/** "Legal" settings section (spec §6.4) linking to the hosted Privacy Policy + Terms, read from
 * `@core/env` (zod-validated, placeholder defaults until the real pages are hosted). */
export function LegalSection() {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      <PixelText size="h2" className="mb-2">
        {t('legal.sectionTitle')}
      </PixelText>
      <LegalLinkRow label={t('legal.privacy')} url={env.privacyUrl} />
      <LegalLinkRow label={t('legal.terms')} url={env.termsUrl} />
    </View>
  );
}
