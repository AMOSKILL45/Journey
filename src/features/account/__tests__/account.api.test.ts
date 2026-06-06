const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockDelete = jest.fn();

// jest forbids a mock factory from closing over non-`mock`-prefixed identifiers; the spies above
// are `mock`-prefixed so the inline File class may reference them (same idiom as 4A/7D/scrapbook).
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
  },
  Paths: { cache: { uri: 'file:///cache/' } },
}));

// Deferred-reference wrappers: jest hoists jest.mock() above these const declarations, so the
// factories must reference the spies lazily (not capture them at eval time). Cast to a variadic
// fn so the spread call type-checks under strict mode.
type AnyFn = (...args: unknown[]) => unknown;

const mockIsAvailable = jest.fn(() => Promise.resolve(true));
const mockShareAsync = jest.fn(() => Promise.resolve());
jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...a: unknown[]) => (mockIsAvailable as AnyFn)(...a),
  shareAsync: (...a: unknown[]) => (mockShareAsync as AnyFn)(...a),
}));

const mockInvoke = jest.fn();
jest.mock('@core/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => (mockInvoke as AnyFn)(...a) } },
}));

import {
  DELETE_ACCOUNT_FN,
  EXPORT_ACCOUNT_DATA_FN,
  SharingUnavailableError,
  deleteAccount,
  exportAccountData,
  exportAndShareAccountData,
  shareAccountExport,
  type AccountExport,
} from '../api/account';

const SAMPLE: AccountExport = {
  exported_at: '2026-06-06T00:00:00.000Z',
  user_id: 'u1',
  app: 'This Is The Journey',
  data: { profile: [{ id: 'u1' }], checkins: [] },
};

describe('account/api', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockCreate.mockClear();
    mockWrite.mockClear();
    mockShareAsync.mockClear();
    mockIsAvailable.mockReset().mockResolvedValue(true);
  });

  describe('deleteAccount', () => {
    it('invokes the delete-account edge fn with an empty body', async () => {
      mockInvoke.mockResolvedValue({ data: { deleted: true }, error: null });
      await deleteAccount();
      expect(mockInvoke).toHaveBeenCalledWith(DELETE_ACCOUNT_FN, { body: {} });
    });

    it('throws on edge error (so the caller can show account.delete.error)', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });
      await expect(deleteAccount()).rejects.toThrow('boom');
    });
  });

  describe('exportAccountData', () => {
    it('invokes export-account-data and returns the bundle', async () => {
      mockInvoke.mockResolvedValue({ data: SAMPLE, error: null });
      const out = await exportAccountData();
      expect(mockInvoke).toHaveBeenCalledWith(EXPORT_ACCOUNT_DATA_FN, { body: {} });
      expect(out).toEqual(SAMPLE);
    });

    it('throws when the edge fn returns no data', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: null });
      await expect(exportAccountData()).rejects.toThrow();
    });
  });

  describe('shareAccountExport', () => {
    it('writes the JSON bundle to a cache file and opens the share sheet', async () => {
      const uri = await shareAccountExport(SAMPLE);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      // The serialized JSON (pretty-printed) is what gets written + round-trips back to the bundle.
      const written = mockWrite.mock.calls[0][0] as string;
      expect(JSON.parse(written)).toEqual(SAMPLE);
      expect(mockShareAsync).toHaveBeenCalledWith(
        uri,
        expect.objectContaining({ mimeType: 'application/json' }),
      );
      expect(uri).toMatch(/^file:\/\/\/cache\/journey-data-export-.*\.json$/);
    });

    it('throws SharingUnavailableError when the platform cannot share', async () => {
      mockIsAvailable.mockResolvedValue(false);
      await expect(shareAccountExport(SAMPLE)).rejects.toBeInstanceOf(SharingUnavailableError);
      expect(mockShareAsync).not.toHaveBeenCalled();
    });
  });

  describe('exportAndShareAccountData', () => {
    it('fetches then shares in one step', async () => {
      mockInvoke.mockResolvedValue({ data: SAMPLE, error: null });
      const uri = await exportAndShareAccountData();
      expect(mockInvoke).toHaveBeenCalledWith(EXPORT_ACCOUNT_DATA_FN, { body: {} });
      expect(mockShareAsync).toHaveBeenCalledTimes(1);
      expect(uri).toMatch(/\.json$/);
    });
  });
});
