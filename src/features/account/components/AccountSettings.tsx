import { View } from 'react-native';

import { PixelCard } from '@shared/components/PixelCard';

import { DeleteAccountRow } from './DeleteAccountRow';
import { ExportDataRow } from './ExportDataRow';
import { LegalSection } from './LegalSection';

/**
 * Account & legal settings block for the profile screen (spec §6, UI spec §3). Groups the
 * non-destructive controls (data export + Legal links) in one card, then renders the destructive
 * "Delete my account" row in its OWN card below, spatially separated and danger-colored
 * (`destructive-nav-separation`).
 */
export function AccountSettings() {
  return (
    <View className="gap-6">
      <PixelCard padding="lg" className="gap-6">
        <ExportDataRow />
        <LegalSection />
      </PixelCard>
      <PixelCard padding="lg">
        <DeleteAccountRow />
      </PixelCard>
    </View>
  );
}
