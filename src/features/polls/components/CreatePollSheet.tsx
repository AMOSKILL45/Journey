import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useMilestones } from '@features/milestones';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { usePollVote } from '../hooks/usePollVote';
import type { PollOption } from '../utils/pollResults';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;
const INITIAL_OPTIONS = 2;

export interface CreatePollSheetRef {
  open: () => void;
  close: () => void;
}
export interface CreatePollSheetProps {
  tripId: string;
}

interface DraftOption {
  key: string;
  text: string;
}

function newKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyOptions(): DraftOption[] {
  return Array.from({ length: INITIAL_OPTIONS }, () => ({ key: newKey(), text: '' }));
}

export const CreatePollSheet = forwardRef<CreatePollSheetRef, CreatePollSheetProps>(
  ({ tripId }, ref) => {
    const { t } = useTranslation();
    const sheetRef = useRef<PixelBottomSheetRef>(null);
    const { create } = usePollVote(tripId);
    const { data: milestones = [] } = useMilestones(tripId);

    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<DraftOption[]>(emptyOptions);
    const [milestoneId, setMilestoneId] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [showDate, setShowDate] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
      setQuestion('');
      setOptions(emptyOptions());
      setMilestoneId(null);
      setExpiresAt(null);
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

    const setOptionText = (key: string, text: string) =>
      setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)));

    const addOption = () =>
      setOptions((prev) =>
        prev.length >= MAX_OPTIONS ? prev : [...prev, { key: newKey(), text: '' }],
      );

    const removeOption = (key: string) =>
      setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((o) => o.key !== key)));

    const save = async () => {
      const trimmedQ = question.trim();
      if (!trimmedQ) {
        setError(t('polls.errors.questionRequired'));
        return;
      }
      const filled: PollOption[] = options
        .map((o, i) => ({ id: `opt${i + 1}`, label: o.text.trim() }))
        .filter((o) => o.label.length > 0);
      if (filled.length < MIN_OPTIONS) {
        setError(t('polls.errors.minOptions', { min: MIN_OPTIONS }));
        return;
      }
      try {
        await create.mutateAsync({
          question: trimmedQ,
          options: filled,
          milestoneId,
          expiresAt,
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
          <PixelText size="h2">{t('polls.create.title')}</PixelText>

          <PixelInput
            label={t('polls.create.question')}
            placeholder={t('polls.create.questionPlaceholder')}
            value={question}
            onChangeText={setQuestion}
            required
          />

          <View className="gap-2">
            <PixelText size="small" family="body-medium">
              {t('polls.create.options')}
            </PixelText>
            {options.map((o, i) => (
              <View key={o.key} className="flex-row items-center gap-2">
                <View className="flex-1">
                  <PixelInput
                    placeholder={t('polls.create.optionPlaceholder', { index: i + 1 })}
                    value={o.text}
                    onChangeText={(v) => setOptionText(o.key, v)}
                    accessibilityLabel={t('polls.create.optionPlaceholder', { index: i + 1 })}
                  />
                </View>
                {options.length > MIN_OPTIONS ? (
                  <Pressable
                    onPress={() => removeOption(o.key)}
                    accessibilityRole="button"
                    accessibilityLabel={t('polls.create.removeOption')}
                    hitSlop={8}
                  >
                    <PixelText size="body" className="text-error">
                      ✕
                    </PixelText>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {options.length < MAX_OPTIONS ? (
              <PixelButton variant="ghost" size="sm" onPress={addOption}>
                {t('polls.create.addOption')}
              </PixelButton>
            ) : null}
          </View>

          {milestones.length > 0 ? (
            <View>
              <PixelText size="small" family="body-medium" className="mb-2">
                {t('polls.create.milestone')}
              </PixelText>
              <View className="flex-row flex-wrap gap-2">
                <PixelChip
                  label={t('polls.create.milestoneNone')}
                  selected={milestoneId === null}
                  onPress={() => setMilestoneId(null)}
                />
                {milestones.map((m) => (
                  <PixelChip
                    key={m.id}
                    label={m.name}
                    selected={milestoneId === m.id}
                    onPress={() => setMilestoneId(m.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View className="flex-row items-center gap-3">
            <PixelButton variant="ghost" onPress={() => setShowDate(true)}>
              {expiresAt ? `⏰ ${expiresAt}` : t('polls.create.expiry')}
            </PixelButton>
            {expiresAt ? (
              <Pressable
                onPress={() => setExpiresAt(null)}
                accessibilityRole="button"
                accessibilityLabel={t('polls.create.clearExpiry')}
              >
                <PixelText size="caption" className="text-error">
                  ✕
                </PixelText>
              </Pressable>
            ) : null}
          </View>
          {showDate ? (
            <DateTimePicker
              value={expiresAt ? new Date(expiresAt) : new Date()}
              mode="date"
              onChange={(_e, d) => {
                setShowDate(Platform.OS === 'ios');
                if (d) setExpiresAt(d.toISOString());
              }}
            />
          ) : null}

          {error ? (
            <PixelText size="caption" className="text-error">
              {error}
            </PixelText>
          ) : null}

          <PixelButton variant="primary" onPress={save} loading={create.isPending} fullWidth>
            {t('polls.create.cta')}
          </PixelButton>
        </View>
      </PixelBottomSheet>
    );
  },
);

CreatePollSheet.displayName = 'CreatePollSheet';
