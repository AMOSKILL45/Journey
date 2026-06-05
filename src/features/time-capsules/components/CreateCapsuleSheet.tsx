import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useMilestones } from '@features/milestones';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { useCapsuleMutations } from '../hooks/useTimeCapsules';

const MESSAGE_LINES = 4;

type Trigger = 'date' | 'milestone';

export interface CreateCapsuleSheetRef {
  open: () => void;
  close: () => void;
}
export interface CreateCapsuleSheetProps {
  tripId: string;
}

export const CreateCapsuleSheet = forwardRef<CreateCapsuleSheetRef, CreateCapsuleSheetProps>(
  ({ tripId }, ref) => {
    const { t } = useTranslation();
    const sheetRef = useRef<PixelBottomSheetRef>(null);
    const { create } = useCapsuleMutations(tripId);
    const { data: milestones = [] } = useMilestones(tripId);
    const { data: members = [] } = useTripMembers(tripId);

    const [message, setMessage] = useState('');
    const [trigger, setTrigger] = useState<Trigger>('date');
    const [openAfter, setOpenAfter] = useState<string | null>(null);
    const [milestoneId, setMilestoneId] = useState<string | null>(null);
    const [recipientId, setRecipientId] = useState<string | null>(null);
    const [showDate, setShowDate] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
      setMessage('');
      setTrigger('date');
      setOpenAfter(null);
      setMilestoneId(null);
      setRecipientId(null);
      setShowDate(false);
      setError(null);
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }));

    const save = async () => {
      const trimmed = message.trim();
      if (!trimmed) {
        setError(t('common.error'));
        return;
      }
      const openAtMilestone = trigger === 'milestone' ? milestoneId : null;
      const dateTrigger = trigger === 'date' ? openAfter : null;
      if (!openAtMilestone && !dateTrigger) {
        setError(t('common.error'));
        return;
      }
      try {
        await create.mutateAsync({
          message: trimmed,
          openAfter: dateTrigger,
          openAtMilestone,
          recipientId,
        });
        reset();
        sheetRef.current?.close();
      } catch {
        setError(t('common.error'));
      }
    };

    return (
      <PixelBottomSheet ref={sheetRef} snapPoints={['85%', '95%']}>
        <View className="gap-4">
          <PixelText size="h2">{t('timeCapsules.create.title')}</PixelText>

          <PixelInput
            label={t('timeCapsules.create.messageLabel')}
            placeholder={t('timeCapsules.create.messagePlaceholder')}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={MESSAGE_LINES}
            required
          />

          <View className="flex-row flex-wrap gap-2">
            <PixelChip
              label={t('timeCapsules.create.triggerDate')}
              selected={trigger === 'date'}
              onPress={() => setTrigger('date')}
            />
            <PixelChip
              label={t('timeCapsules.create.triggerMilestone')}
              selected={trigger === 'milestone'}
              onPress={() => setTrigger('milestone')}
            />
          </View>

          {trigger === 'date' ? (
            <View className="flex-row items-center gap-3">
              <PixelButton variant="ghost" onPress={() => setShowDate(true)}>
                {openAfter
                  ? new Date(openAfter).toLocaleDateString()
                  : t('timeCapsules.create.triggerDate')}
              </PixelButton>
              {showDate ? (
                <DateTimePicker
                  value={openAfter ? new Date(openAfter) : new Date()}
                  mode="date"
                  onChange={(_e, d) => {
                    setShowDate(Platform.OS === 'ios');
                    if (d) setOpenAfter(d.toISOString());
                  }}
                />
              ) : null}
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {milestones.map((m) => (
                <PixelChip
                  key={m.id}
                  label={m.name}
                  selected={milestoneId === m.id}
                  onPress={() => setMilestoneId(m.id)}
                />
              ))}
            </View>
          )}

          <View className="gap-2">
            <PixelText size="small" family="body-medium">
              {t('timeCapsules.create.recipientLabel')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              <PixelChip
                label={t('timeCapsules.create.recipientEveryone')}
                selected={recipientId === null}
                onPress={() => setRecipientId(null)}
              />
              {members.map((m) => (
                <PixelChip
                  key={m.user_id}
                  label={m.profile?.display_name ?? m.user_id.slice(0, 6)}
                  selected={recipientId === m.user_id}
                  onPress={() => setRecipientId(m.user_id)}
                />
              ))}
            </View>
          </View>

          {error ? (
            <PixelText size="caption" className="text-error">
              {error}
            </PixelText>
          ) : null}

          <PixelButton variant="primary" onPress={save} loading={create.isPending} fullWidth>
            {t('timeCapsules.create.seal')}
          </PixelButton>
        </View>
      </PixelBottomSheet>
    );
  },
);

CreateCapsuleSheet.displayName = 'CreateCapsuleSheet';
