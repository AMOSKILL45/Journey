jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { supabase } from '@core/supabase/client';

import {
  FileTooLargeError,
  createFileDocument,
  createUrlDocument,
  listTripDocuments,
} from '../api/documents';

describe('documents api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists documents for a trip newest-first', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [{ id: 'd1' }], error: null }),
        }) as never,
    );
    const result = await listTripDocuments('t1');
    expect(result).toEqual([{ id: 'd1' }]);
  });

  it('creates a url document with file_type=url and no storage_path', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'd2', file_type: 'url' }, error: null }),
      }),
    });
    jest.spyOn(supabase, 'from').mockReturnValue({ insert } as never);

    const doc = await createUrlDocument({
      tripId: 't1',
      category: 'tickets',
      name: 'Booking',
      url: 'https://example.com/r',
    });

    expect(doc).toEqual({ id: 'd2', file_type: 'url' });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trip_id: 't1',
        file_type: 'url',
        external_url: 'https://example.com/r',
        storage_path: null,
        uploaded_by: 'u1',
      }),
    );
  });

  it('rejects oversize files before any upload', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    await expect(
      createFileDocument({
        tripId: 't1',
        category: 'tickets',
        name: 'huge',
        fileType: 'pdf',
        uri: 'file:///huge.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 26 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
  });
});
