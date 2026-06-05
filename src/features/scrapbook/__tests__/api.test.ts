const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockDelete = jest.fn();
const mockBytes = jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3])));

// jest forbids a mock factory from closing over non-`mock`-prefixed identifiers; the spies above
// are `mock`-prefixed so the inline File class may reference them (same idiom as 4A/7D tests).
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    exists = false;
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///cache/${name}`;
    }
    create = mockCreate;
    write = mockWrite;
    delete = mockDelete;
    bytes = mockBytes;
  },
  Paths: { cache: { uri: 'file:///cache/' } },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Controllable supabase client: each test wires the storage/functions/db behaviour it needs.
const mockGetUser = jest.fn();
const mockStorageFrom = jest.fn();
const mockInvoke = jest.fn();
const mockDbFrom = jest.fn();
jest.mock('@core/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    storage: { from: (...a: unknown[]) => mockStorageFrom(...a) },
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    from: (...a: unknown[]) => mockDbFrom(...a),
  },
}));

import {
  GENERATE_SCRAPBOOK_FN,
  SCRAPBOOKS_BUCKET,
  generateScrapbook,
  listScrapbooks,
} from '../api';

describe('scrapbook api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('exposes the bucket + edge slug as the contract names', () => {
    expect(SCRAPBOOKS_BUCKET).toBe('trip-scrapbooks');
    expect(GENERATE_SCRAPBOOK_FN).toBe('generate_scrapbook');
  });

  describe('generateScrapbook', () => {
    it('uploads the PNG before invoking the edge function (handshake order)', async () => {
      const calls: string[] = [];
      const upload = jest.fn((_path: string, _body: unknown, _opts: unknown) => {
        calls.push('upload');
        return Promise.resolve({ error: null });
      });
      const remove = jest.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({ upload, remove });
      mockInvoke.mockImplementation(() => {
        calls.push('invoke');
        return Promise.resolve({ data: { pngUrl: 'p', pdfUrl: 'd' }, error: null });
      });

      const res = await generateScrapbook({ tripId: 'trip-9', pngBase64: 'BASE64' });

      // Ordering: the function reads the PNG by path, so upload must precede invoke.
      expect(calls).toEqual(['upload', 'invoke']);

      // Upload targets the private bucket at <tripId>/<uuid>.png.
      expect(mockStorageFrom).toHaveBeenCalledWith(SCRAPBOOKS_BUCKET);
      const [pathArg, , opts] = upload.mock.calls[0];
      expect(pathArg).toMatch(/^trip-9\/.+\.png$/);
      expect(opts).toEqual(expect.objectContaining({ contentType: 'image/png', upsert: false }));

      // Invoke carries the slug + { trip_id, png_path } body, png_path === the uploaded path.
      const [slug, options] = mockInvoke.mock.calls[0];
      expect(slug).toBe(GENERATE_SCRAPBOOK_FN);
      expect(options.body).toEqual({ trip_id: 'trip-9', png_path: pathArg });

      expect(res).toEqual({ pngUrl: 'p', pdfUrl: 'd' });
    });

    it('removes the orphaned PNG when the edge function fails', async () => {
      const upload = jest.fn((_path: string) => Promise.resolve({ error: null }));
      const remove = jest.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({ upload, remove });
      mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });

      await expect(generateScrapbook({ tripId: 'trip-9', pngBase64: 'BASE64' })).rejects.toThrow(
        'boom',
      );

      const [pathArg] = upload.mock.calls[0];
      expect(remove).toHaveBeenCalledWith([pathArg]);
    });

    it('rejects an empty render without uploading', async () => {
      const upload = jest.fn();
      mockStorageFrom.mockReturnValue({ upload });
      await expect(generateScrapbook({ tripId: 't', pngBase64: '' })).rejects.toThrow();
      expect(upload).not.toHaveBeenCalled();
    });
  });

  describe('listScrapbooks', () => {
    it('returns rows newest-first with signed PNG/PDF urls', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [{ id: 's1', trip_id: 't1', png_path: 'a.png', pdf_path: 'b.pdf' }],
        error: null,
      });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      mockDbFrom.mockReturnValue({ select });

      const createSignedUrl = jest
        .fn()
        .mockResolvedValueOnce({ data: { signedUrl: 'PNG_URL' }, error: null })
        .mockResolvedValueOnce({ data: { signedUrl: 'PDF_URL' }, error: null });
      mockStorageFrom.mockReturnValue({ createSignedUrl });

      const rows = await listScrapbooks('t1');

      expect(order).toHaveBeenCalledWith('generated_at', { ascending: false });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(
        expect.objectContaining({ id: 's1', pngUrl: 'PNG_URL', pdfUrl: 'PDF_URL' }),
      );
    });

    it('returns an empty array when the trip has no scrapbooks', async () => {
      const order = jest.fn().mockResolvedValue({ data: [], error: null });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      mockDbFrom.mockReturnValue({ select });

      expect(await listScrapbooks('t1')).toEqual([]);
    });
  });
});
