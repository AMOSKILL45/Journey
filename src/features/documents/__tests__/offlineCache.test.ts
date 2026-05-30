jest.mock('expo-file-system', () => {
  const state: Record<string, boolean> = {};
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return state[this.uri] ?? false;
    }
    delete() {
      delete state[this.uri];
    }
    static downloadFileAsync = jest.fn((_url: string, dest: { uri: string }) => {
      state[dest.uri] = true;
      return Promise.resolve(dest);
    });
  }
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return true;
    }
    create() {}
  }
  return { Paths: { document: { uri: 'file:///docdir' } }, File, Directory };
});

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
}));

import { File } from 'expo-file-system';

import type { DocumentRow } from '../api/documents';
import {
  downloadDoc,
  evictDoc,
  isDownloaded,
  listDownloadedIds,
  localPathFor,
} from '../utils/offlineCache';

const fileDoc = {
  id: 'd1',
  trip_id: 't1',
  file_type: 'image',
  mime_type: 'image/jpeg',
  storage_path: 't1/abc.jpg',
} as unknown as DocumentRow;

const urlDoc = { id: 'd2', trip_id: 't1', file_type: 'url' } as unknown as DocumentRow;

describe('offlineCache', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    jest.clearAllMocks();
  });

  it('builds a local path under the document directory', () => {
    expect(localPathFor(fileDoc)).toBe('file:///docdir/documents/t1/d1.jpg');
  });

  it('url docs are never downloaded', () => {
    expect(isDownloaded(urlDoc)).toBe(false);
  });

  it('downloadDoc downloads and records the id in the registry', async () => {
    await downloadDoc(fileDoc, 'https://signed/url');
    expect(File.downloadFileAsync).toHaveBeenCalledWith(
      'https://signed/url',
      expect.objectContaining({ uri: 'file:///docdir/documents/t1/d1.jpg' }),
    );
    expect(await listDownloadedIds('t1')).toEqual(['d1']);
    expect(isDownloaded(fileDoc)).toBe(true);
  });

  it('evictDoc deletes the file and removes it from the registry', async () => {
    await downloadDoc(fileDoc, 'https://signed/url');
    await evictDoc(fileDoc);
    expect(isDownloaded(fileDoc)).toBe(false);
    expect(await listDownloadedIds('t1')).toEqual([]);
  });
});
