import { useState } from 'react';
import { Alert } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelButton } from '@shared/components/PixelButton';

import { exportTripIcs } from '../api';
import type { IcsMilestone, IcsTrip } from '../utils/ics';

export interface ExportTripButtonProps {
  trip: IcsTrip;
  milestones: readonly IcsMilestone[];
}

/** True when at least one milestone carries a date the .ics can schedule. */
function hasSchedulableMilestone(milestones: readonly IcsMilestone[]): boolean {
  return milestones.some((m) => Boolean(m.arrival_at) || Boolean(m.departure_at));
}

/**
 * Secondary action that exports the whole trip as an .ics file and opens the OS
 * share sheet. Disabled (with a hint) when no milestone has a date.
 */
export function ExportTripButton({ trip, milestones }: ExportTripButtonProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const exportable = hasSchedulableMilestone(milestones);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportTripIcs(trip, milestones);
      haptics.success();
    } catch {
      Alert.alert(t('calendarExport.errorTitle'), t('calendarExport.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PixelButton
      variant="secondary"
      onPress={onPress}
      loading={busy}
      disabled={!exportable}
      accessibilityLabel={t('calendarExport.exportA11y')}
      fullWidth
    >
      {exportable ? t('calendarExport.export') : t('calendarExport.empty')}
    </PixelButton>
  );
}
