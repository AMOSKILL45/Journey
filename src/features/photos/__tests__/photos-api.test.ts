jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() =>
    Promise.resolve({ uri: 'file:///out.jpg', width: 1600, height: 1200 }),
  ),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { supabase } from '@core/supabase/client';

import {
  PHOTOS_BUCKET,
  PhotoTooLargeError,
  deletePhoto,
  listTripPhotos,
  toggleReaction,
  uploadPhoto,
} from '../api';

const realFetch = global.fetch;

describe('photos api', () => {
  beforeEach(() => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    global.fetch = jest.fn(() =>
      Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
    ) as unknown as typeof fetch;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = realFetch;
  });

  it('rejects oversize photos before any upload', async () => {
    await expect(
      uploadPhoto({ tripId: 't1', uri: 'file:///huge.jpg', sizeBytes: 26 * 1024 * 1024 }),
    ).rejects.toBeInstanceOf(PhotoTooLargeError);
  });

  it('uploads to trip-photos at <tripId>/<uuid>.jpg and inserts the row', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const remove = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ upload, remove } as never);

    const single = jest.fn().mockResolvedValue({ data: { id: 'p1' }, error: null });
    const insert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) });
    jest.spyOn(supabase, 'from').mockReturnValue({ insert } as never);

    const result = await uploadPhoto({
      tripId: 'trip-123',
      uri: 'file:///in.jpg',
      sizeBytes: 1000,
      caption: '  hi  ',
    });

    expect(result).toEqual({ id: 'p1' });
    const [bucketArg] = (supabase.storage.from as jest.Mock).mock.calls[0];
    expect(bucketArg).toBe(PHOTOS_BUCKET);

    const [pathArg, , opts] = upload.mock.calls[0];
    expect(pathArg).toMatch(/^trip-123\/.+\.jpg$/);
    expect(opts).toEqual(expect.objectContaining({ contentType: 'image/jpeg', upsert: false }));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trip_id: 'trip-123',
        user_id: 'u1',
        caption: 'hi',
        width: 1600,
        height: 1200,
        size_bytes: 1000,
      }),
    );
  });

  it('cleans up the uploaded object when the row insert fails', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const remove = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ upload, remove } as never);
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const insert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) });
    jest.spyOn(supabase, 'from').mockReturnValue({ insert } as never);

    await expect(
      uploadPhoto({ tripId: 't1', uri: 'file:///in.jpg', sizeBytes: 1 }),
    ).rejects.toBeTruthy();
    expect(remove).toHaveBeenCalled();
  });

  it('lists photos with signed urls and drops rows without a url', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { id: 'p1', storage_path: 't1/a.jpg' },
        { id: 'p2', storage_path: 't1/b.jpg' },
      ],
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order,
    } as never);
    const createSignedUrls = jest.fn().mockResolvedValue({
      data: [
        { path: 't1/a.jpg', signedUrl: 'https://signed/a' },
        { path: 't1/b.jpg', signedUrl: null },
      ],
      error: null,
    });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ createSignedUrls } as never);

    const out = await listTripPhotos('t1');
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(expect.objectContaining({ id: 'p1', url: 'https://signed/a' }));
  });

  it('toggleReaction inserts when no existing reaction', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const insert = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
      insert,
    } as never);

    const res = await toggleReaction('photo', 'p1', 'heart');
    expect(res).toEqual({ added: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        target_type: 'photo',
        target_id: 'p1',
        emoji: 'heart',
        user_id: 'u1',
      }),
    );
  });

  it('toggleReaction deletes when a reaction already exists', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
    const del = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
      delete: del,
    } as never);

    const res = await toggleReaction('milestone', 'm1', 'fire');
    expect(res).toEqual({ added: false });
    expect(del).toHaveBeenCalled();
  });

  it('deletePhoto removes the object then the row', async () => {
    const remove = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ remove } as never);
    const eq = jest.fn().mockResolvedValue({ error: null });
    jest
      .spyOn(supabase, 'from')
      .mockReturnValue({ delete: jest.fn().mockReturnValue({ eq }) } as never);

    await deletePhoto({ id: 'p1', storage_path: 't1/a.jpg' });
    expect(remove).toHaveBeenCalledWith(['t1/a.jpg']);
    expect(eq).toHaveBeenCalledWith('id', 'p1');
  });
});
