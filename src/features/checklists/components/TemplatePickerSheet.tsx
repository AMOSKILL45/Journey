import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelText } from '@shared/components/PixelText';

import { listTemplates, type ChecklistTemplate } from '../api/checklists';
import { applyTemplate } from '../utils/applyTemplate';

export interface TemplatePickerSheetRef {
  open: () => void;
}
export interface TemplatePickerSheetProps {
  tripId: string;
  onApplied: () => void;
}

export const TemplatePickerSheet = forwardRef<TemplatePickerSheetRef, TemplatePickerSheetProps>(
  ({ tripId, onApplied }, ref) => {
    const { t } = useTranslation();
    const sheetRef = useRef<PixelBottomSheetRef>(null);
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [busy, setBusy] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        void listTemplates().then(setTemplates);
        sheetRef.current?.open();
      },
    }));

    const apply = async (tpl: ChecklistTemplate) => {
      setBusy(tpl.id);
      try {
        await applyTemplate(tripId, tpl, t);
        sheetRef.current?.close();
        onApplied();
      } finally {
        setBusy(null);
      }
    };

    return (
      <PixelBottomSheet ref={sheetRef} snapPoints={['60%', '90%']}>
        <View className="gap-3">
          <PixelText size="h2">{t('checklists.startFromTemplate')}</PixelText>
          {templates.map((tpl) => (
            <Pressable
              key={tpl.id}
              onPress={() => apply(tpl)}
              disabled={busy !== null}
              accessibilityRole="button"
              className="rounded border-2 border-border bg-surface-alt p-3"
            >
              <PixelText size="body" family="body-medium">
                {t(`${tpl.i18n_key}.name`)}
              </PixelText>
              {busy === tpl.id ? (
                <PixelText size="caption" className="text-text-secondary">
                  {t('common.loading')}
                </PixelText>
              ) : null}
            </Pressable>
          ))}
        </View>
      </PixelBottomSheet>
    );
  },
);

TemplatePickerSheet.displayName = 'TemplatePickerSheet';
