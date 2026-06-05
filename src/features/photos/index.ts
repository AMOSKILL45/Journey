// Phase 7A — Photos + Reactions
export {
  uploadPhoto,
  listTripPhotos,
  updatePhotoCaption,
  deletePhoto,
  listReactions,
  toggleReaction,
  PhotoTooLargeError,
  PHOTOS_BUCKET,
  MAX_PHOTO_BYTES,
} from './api';
export type {
  PhotoRow,
  PhotoInsert,
  PhotoWithUrl,
  ReactionRow,
  ReactionTargetType,
  UploadPhotoInput,
  ToggleReactionResult,
} from './api';

export { REACTION_IDS, REACTION_GLYPH, reactionAssets } from './data/reactionSet';
export type { ReactionId } from './data/reactionSet';

export { tallyReactions, totalReactions } from './utils/reactions';
export type {
  ReactionRow as ReactionTallyRow,
  ReactionTallies,
  ReactionTally,
} from './utils/reactions';
export { normalizeCaption, isValidCaption, MAX_CAPTION_LENGTH } from './utils/caption';

export {
  useTripPhotos,
  useUploadPhoto,
  useDeletePhoto,
  useUpdatePhotoCaption,
  photosQueryKey,
} from './hooks/useTripPhotos';
export { usePhotoReactions, reactionsQueryKey } from './hooks/usePhotoReactions';

export { ReactionBar } from './components/ReactionBar';
export type { ReactionBarProps } from './components/ReactionBar';
export { PhotoGrid } from './components/PhotoGrid';
export type { PhotoGridProps } from './components/PhotoGrid';
export { PhotoUploadButton } from './components/PhotoUploadButton';
export type { PhotoUploadButtonProps } from './components/PhotoUploadButton';
export { PhotoViewer } from './components/PhotoViewer';
export type { PhotoViewerProps } from './components/PhotoViewer';
export { PhotoSection } from './components/PhotoSection';
export type { PhotoSectionProps } from './components/PhotoSection';

export { PhotosScreen } from './screens/PhotosScreen';
