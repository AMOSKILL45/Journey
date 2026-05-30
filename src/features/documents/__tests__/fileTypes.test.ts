import {
  MAX_FILE_BYTES,
  extensionForMime,
  fileTypeFromMime,
  formatBytes,
  iconForFileType,
  isValidUrl,
} from '../utils/fileTypes';

describe('fileTypes', () => {
  it('maps mime to file_type', () => {
    expect(fileTypeFromMime('application/pdf')).toBe('pdf');
    expect(fileTypeFromMime('image/jpeg')).toBe('image');
    expect(fileTypeFromMime('image/png')).toBe('image');
    expect(fileTypeFromMime('text/plain')).toBeNull();
    expect(fileTypeFromMime(null)).toBeNull();
  });

  it('maps mime to a file extension', () => {
    expect(extensionForMime('application/pdf')).toBe('pdf');
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('weird/thing')).toBe('bin');
  });

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('validates http(s) urls only', () => {
    expect(isValidUrl('https://example.com/x')).toBe(true);
    expect(isValidUrl('http://a.b')).toBe(true);
    expect(isValidUrl('ftp://a.b')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('exposes a 25MB cap and per-type icons', () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(iconForFileType('pdf')).toBeTruthy();
    expect(iconForFileType('url')).toBeTruthy();
  });
});
