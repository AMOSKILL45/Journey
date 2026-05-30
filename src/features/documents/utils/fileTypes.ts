export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export type DocFileType = 'pdf' | 'image' | 'url';

export function fileTypeFromMime(mime: string | null | undefined): 'pdf' | 'image' | null {
  if (!mime) return null;
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

export function extensionForMime(mime: string | null | undefined): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function iconForFileType(fileType: DocFileType): string {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'image':
      return '🖼️';
    case 'url':
      return '🔗';
  }
}
