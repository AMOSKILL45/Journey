import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { t } from '@core/i18n';

import type { PhotoWithUrl } from '../api';
import { GHOST_AUTHOR_ID } from '../data/ghostAuthor';

const mockToggle = { mutate: jest.fn() };
const mockHapticsSelection = jest.fn();

jest.mock('@features/feedback', () => ({
  haptics: {
    selection: (...a: unknown[]) => mockHapticsSelection(...a),
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('expo-image', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.View };
});

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUsePhotoReactions = jest.fn();
jest.mock('../hooks/usePhotoReactions', () => ({
  usePhotoReactions: (...a: unknown[]) => mockUsePhotoReactions(...a),
}));

const mockUseTripMembers = jest.fn();
jest.mock('@features/trips/hooks/useTripMembers', () => ({
  useTripMembers: (...a: unknown[]) => mockUseTripMembers(...a),
}));

const mockUseTripPhotos = jest.fn();
const mockUseUploadPhoto = jest.fn();
const mockUseDeletePhoto = jest.fn();
const mockUseUpdatePhotoCaption = jest.fn();
jest.mock('../hooks/useTripPhotos', () => ({
  useTripPhotos: (...a: unknown[]) => mockUseTripPhotos(...a),
  useUploadPhoto: (...a: unknown[]) => mockUseUploadPhoto(...a),
  useDeletePhoto: (...a: unknown[]) => mockUseDeletePhoto(...a),
  useUpdatePhotoCaption: (...a: unknown[]) => mockUseUpdatePhotoCaption(...a),
}));

import * as ImagePicker from 'expo-image-picker';

import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoSection } from '../components/PhotoSection';
import { PhotoUploadButton } from '../components/PhotoUploadButton';
import { PhotoViewer } from '../components/PhotoViewer';
import { ReactionBar } from '../components/ReactionBar';

const photo = (id: string): PhotoWithUrl =>
  ({
    id,
    trip_id: 't1',
    milestone_id: null,
    user_id: 'u1',
    storage_path: `t1/${id}.jpg`,
    caption: null,
    taken_at: null,
    width: 100,
    height: 100,
    size_bytes: 10,
    created_at: '2026-06-05T00:00:00Z',
    url: `https://signed/${id}`,
  }) as PhotoWithUrl;

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePhotoReactions.mockReturnValue({ data: [], toggle: mockToggle });
  mockUseTripPhotos.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseTripMembers.mockReturnValue({ data: [] });
  mockUseUploadPhoto.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseDeletePhoto.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseUpdatePhotoCaption.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

describe('ReactionBar', () => {
  it('renders six reaction buttons', () => {
    const { getByTestId } = render(
      <ReactionBar targetType="photo" targetId="p1" currentUserId="me" />,
    );
    for (const e of ['heart', 'fire', 'laugh', 'wow', 'clap', 'star']) {
      expect(getByTestId(`reaction-${e}`)).toBeTruthy();
    }
  });

  it('toggles the reaction and fires a selection haptic on press', () => {
    const { getByTestId } = render(
      <ReactionBar targetType="milestone" targetId="m1" currentUserId="me" />,
    );
    fireEvent.press(getByTestId('reaction-heart'));
    expect(mockToggle.mutate).toHaveBeenCalledWith('heart');
    expect(mockHapticsSelection).toHaveBeenCalledTimes(1);
  });

  it('in compact mode hides zero-count reactions', () => {
    mockUsePhotoReactions.mockReturnValue({
      data: [{ id: 'r1', emoji: 'fire', user_id: 'x' }],
      toggle: mockToggle,
    });
    const { getByTestId, queryByTestId } = render(
      <ReactionBar targetType="milestone" targetId="m1" currentUserId="me" compact />,
    );
    expect(getByTestId('reaction-fire')).toBeTruthy();
    expect(queryByTestId('reaction-heart')).toBeNull();
  });
});

describe('PhotoGrid', () => {
  it('calls onPressPhoto when a tile is tapped', () => {
    const onPress = jest.fn();
    const { getAllByRole } = render(
      <PhotoGrid photos={[photo('a'), photo('b')]} onPressPhoto={onPress} />,
    );
    const tiles = getAllByRole('imagebutton');
    expect(tiles).toHaveLength(2);
    fireEvent.press(tiles[0]);
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});

describe('PhotoUploadButton', () => {
  it('uploads the picked image from the library', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ id: 'p1' });
    mockUseUploadPhoto.mockReturnValue({ mutateAsync, isPending: false });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///pick.jpg', fileSize: 123, width: 800, height: 600 }],
    });
    const onUploaded = jest.fn();
    const { getAllByRole } = render(
      <PhotoUploadButton tripId="t1" milestoneId={null} onUploaded={onUploaded} />,
    );
    // [0] = library, [1] = camera.
    fireEvent.press(getAllByRole('button')[0]);
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ uri: 'file:///pick.jpg', sizeBytes: 123 }),
      ),
    );
    expect(onUploaded).toHaveBeenCalled();
  });

  it('does nothing when the picker is canceled', async () => {
    const mutateAsync = jest.fn();
    mockUseUploadPhoto.mockReturnValue({ mutateAsync, isPending: false });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });
    const { getAllByRole } = render(<PhotoUploadButton tripId="t1" />);
    fireEvent.press(getAllByRole('button')[1]);
    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

describe('PhotoSection', () => {
  it('renders the shared empty state when there are no photos', () => {
    const { getByText, queryAllByRole } = render(
      <PhotoSection tripId="t1" currentUserId="me" canManage={false} />,
    );
    expect(getByText(t('emptyStates.photos.title'))).toBeTruthy();
    expect(getByText(t('emptyStates.photos.body'))).toBeTruthy();
    // No grid tiles in the empty state.
    expect(queryAllByRole('imagebutton')).toHaveLength(0);
  });

  it('renders a skeleton loading state while photos load', () => {
    mockUseTripPhotos.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    const { getByLabelText } = render(<PhotoSection tripId="t1" currentUserId="me" canManage />);
    // LoadingState announces a loading label to screen readers.
    expect(getByLabelText(t('common.loading'))).toBeTruthy();
  });

  it('renders an error state with a retry that refetches', () => {
    const refetch = jest.fn();
    mockUseTripPhotos.mockReturnValue({ data: [], isLoading: false, isError: true, refetch });
    const { getByText } = render(<PhotoSection tripId="t1" currentUserId="me" canManage />);
    expect(getByText(t('common.somethingWentWrong'))).toBeTruthy();
    fireEvent.press(getByText(t('common.retry')));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders a grid when photos exist', () => {
    mockUseTripPhotos.mockReturnValue({
      data: [photo('a')],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { getAllByRole } = render(<PhotoSection tripId="t1" currentUserId="me" canManage />);
    expect(getAllByRole('imagebutton').length).toBeGreaterThan(0);
  });
});

describe('PhotoViewer', () => {
  const openPhoto = photo('a');

  it('renders an author byline when an author name is provided', () => {
    const { getByLabelText } = render(
      <PhotoViewer
        tripId="t1"
        photo={openPhoto}
        authorName="Ana"
        currentUserId="me"
        canManage={false}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText(t('documents.uploadedBy', { name: 'Ana' }))).toBeTruthy();
  });

  it('shows the ghost author name for a deleted author', () => {
    const ghostName = t('account.ghostName');
    const ghostPhoto = { ...openPhoto, user_id: GHOST_AUTHOR_ID } as PhotoWithUrl;
    const { getByLabelText } = render(
      <PhotoViewer
        tripId="t1"
        photo={ghostPhoto}
        authorName={ghostName}
        currentUserId="me"
        canManage={false}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText(t('documents.uploadedBy', { name: ghostName }))).toBeTruthy();
  });

  it('omits the byline when no author name is given', () => {
    const { queryByLabelText } = render(
      <PhotoViewer
        tripId="t1"
        photo={openPhoto}
        currentUserId="me"
        canManage={false}
        onClose={jest.fn()}
      />,
    );
    expect(queryByLabelText(t('documents.uploadedBy', { name: 'Ana' }))).toBeNull();
  });

  it('renders nothing when there is no active photo', () => {
    const { toJSON } = render(
      <PhotoViewer
        tripId="t1"
        photo={null}
        currentUserId="me"
        canManage={false}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});
