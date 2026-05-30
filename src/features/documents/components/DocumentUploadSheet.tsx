import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useMilestones } from '@features/milestones';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { useCreateFileDocument, useCreateUrlDocument } from '../hooks/useDocuments';
import { fileTypeFromMime, isValidUrl } from '../utils/fileTypes';

export const SUGGESTED_CATEGORIES = [
  'tickets',
  'lodging',
  'insurance',
  'visa',
  'transport',
  'other',
] as const;

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  fileType: 'pdf' | 'image';
};

export interface DocumentUploadSheetRef {
  open: () => void;
  close: () => void;
}

export interface DocumentUploadSheetProps {
  tripId: string;
  onCreated?: () => void;
}

export const DocumentUploadSheet = forwardRef<DocumentUploadSheetRef, DocumentUploadSheetProps>(
  ({ tripId, onCreated }, ref) => {
    const { t } = useTranslation();
    const sheetRef = useRef<PixelBottomSheetRef>(null);
    const createFile = useCreateFileDocument(tripId);
    const createUrl = useCreateUrlDocument(tripId);
    const { data: milestones = [] } = useMilestones(tripId);

    const [picked, setPicked] = useState<PickedFile | null>(null);
    const [urlValue, setUrlValue] = useState('');
    const [isUrlMode, setIsUrlMode] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState<string>('tickets');
    const [milestoneId, setMilestoneId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const reset = useCallback(() => {
      setPicked(null);
      setUrlValue('');
      setIsUrlMode(false);
      setName('');
      setCategory('tickets');
      setMilestoneId(null);
      setFormError(null);
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }));

    const pickDocument = async () => {
      setFormError(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setIsUrlMode(false);
      setPicked({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType ?? 'application/pdf',
        sizeBytes: a.size ?? 0,
        fileType: 'pdf',
      });
      if (!name) setName(a.name.replace(/\.[^/.]+$/, ''));
    };

    const pickImage = async (fromCamera: boolean) => {
      setFormError(null);
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setFormError(t('documents.errors.permissionDenied'));
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setIsUrlMode(false);
      setPicked({
        uri: a.uri,
        name: a.fileName ?? 'photo.jpg',
        mimeType: a.mimeType ?? 'image/jpeg',
        sizeBytes: a.fileSize ?? 0,
        fileType: fileTypeFromMime(a.mimeType) === 'pdf' ? 'pdf' : 'image',
      });
    };

    const startUrlMode = () => {
      setPicked(null);
      setIsUrlMode(true);
      setFormError(null);
    };

    const handleSave = async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setFormError(t('documents.errors.nameRequired'));
        return;
      }
      setFormError(null);
      try {
        if (isUrlMode) {
          if (!isValidUrl(urlValue)) {
            setFormError(t('documents.errors.invalidUrl'));
            return;
          }
          await createUrl.mutateAsync({
            name: trimmedName,
            category,
            url: urlValue.trim(),
            milestoneId,
          });
        } else if (picked) {
          await createFile.mutateAsync({
            name: trimmedName,
            category,
            fileType: picked.fileType,
            uri: picked.uri,
            mimeType: picked.mimeType,
            sizeBytes: picked.sizeBytes,
            milestoneId,
          });
        } else {
          setFormError(t('documents.form.pickSource'));
          return;
        }
        reset();
        sheetRef.current?.close();
        onCreated?.();
      } catch (e) {
        if (e instanceof Error && e.name === 'FileTooLargeError') {
          setFormError(t('documents.errors.tooLarge'));
        } else {
          setFormError(t('documents.errors.uploadFailed'));
        }
      }
    };

    const isSaving = createFile.isPending || createUrl.isPending;
    const hasSource = isUrlMode || picked !== null;

    return (
      <PixelBottomSheet ref={sheetRef} snapPoints={['80%', '95%']}>
        <View className="gap-4">
          <PixelText size="h2">{t('documents.addCta')}</PixelText>

          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('documents.form.pickSource')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              <PixelChip
                label={t('documents.source.files')}
                selected={picked?.fileType === 'pdf'}
                onPress={pickDocument}
              />
              <PixelChip
                label={t('documents.source.photo')}
                selected={false}
                onPress={() => pickImage(false)}
              />
              <PixelChip
                label={t('documents.source.camera')}
                selected={false}
                onPress={() => pickImage(true)}
              />
              <PixelChip
                label={t('documents.source.url')}
                selected={isUrlMode}
                onPress={startUrlMode}
              />
            </View>
            {picked ? (
              <PixelText size="caption" className="mt-2 text-text-secondary">
                {picked.name}
              </PixelText>
            ) : null}
          </View>

          {isUrlMode ? (
            <PixelInput
              label={t('documents.form.urlLabel')}
              placeholder={t('documents.form.urlPlaceholder')}
              autoCapitalize="none"
              keyboardType="url"
              value={urlValue}
              onChangeText={setUrlValue}
            />
          ) : null}

          <PixelInput
            label={t('documents.form.nameLabel')}
            placeholder={t('documents.form.namePlaceholder')}
            value={name}
            onChangeText={setName}
            required
          />

          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('documents.form.categoryLabel')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTED_CATEGORIES.map((c) => (
                <PixelChip
                  key={c}
                  label={t(`documents.category.${c}`)}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>
          </View>

          {milestones.length > 0 ? (
            <View>
              <PixelText size="small" family="body-medium" className="mb-2">
                {t('documents.form.milestoneLabel')}
              </PixelText>
              <View className="flex-row flex-wrap gap-2">
                <PixelChip
                  label={t('documents.form.milestoneNone')}
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

          {formError ? (
            <PixelText size="caption" className="text-error">
              {formError}
            </PixelText>
          ) : null}

          <PixelButton
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            disabled={!hasSource}
            fullWidth
          >
            {t('documents.form.save')}
          </PixelButton>
        </View>
      </PixelBottomSheet>
    );
  },
);

DocumentUploadSheet.displayName = 'DocumentUploadSheet';
