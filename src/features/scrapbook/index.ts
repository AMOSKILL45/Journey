// Phase 7E — Trip Scrapbook (depends 7A photos + 7C enrichment).
// On-demand recap: a Skia PNG "story" card rendered client-side (ADR-003) + a PDF album
// composed by the `generate_scrapbook` edge function. Both artifacts live in the private
// `trip-scrapbooks` bucket and are shared via signed URLs.

export {
  generateScrapbook,
  listScrapbooks,
  fetchScrapbookInputs,
  shareScrapbookArtifact,
  SCRAPBOOKS_BUCKET,
  GENERATE_SCRAPBOOK_FN,
  ScrapbookRenderError,
  SharingUnavailableError,
  type ScrapbookRow,
  type ScrapbookWithUrls,
  type ScrapbookResult,
  type ScrapbookInputs,
  type ScrapbookArtifact,
  type GenerateScrapbookInput,
} from './api';

export { computeTripStats, type TripStats } from './utils/stats';
export { formatCardDistance, formatStatLine, type CardStat } from './utils/cardLayout';

export {
  useScrapbooks,
  useScrapbookInputs,
  useGenerateScrapbook,
  scrapbooksQueryKey,
  scrapbookInputsQueryKey,
} from './hooks/useScrapbook';

export {
  ScrapbookCard,
  CARD_WIDTH,
  CARD_HEIGHT,
  MAX_CARD_PHOTOS,
  type ScrapbookCardProps,
  type ScrapbookCardHandle,
  type CardMilestone,
} from './components/ScrapbookCard';
export { ScrapbookButton, type ScrapbookButtonProps } from './components/ScrapbookButton';
export { ScrapbookViewer, type ScrapbookViewerProps } from './components/ScrapbookViewer';
export { ScrapbookSection, type ScrapbookSectionProps } from './components/ScrapbookSection';
