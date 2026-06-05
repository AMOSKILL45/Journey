import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { buildIcs, tripIcsSlug, type IcsMilestone, type IcsTrip } from './utils/ics';

/** MIME type for an iCalendar document (RFC-5545). */
export const ICS_MIME_TYPE = 'text/calendar';
const ICS_EXTENSION = 'ics';

export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device');
    this.name = 'SharingUnavailableError';
  }
}

/** Filename (with extension) written to the cache dir for a trip export. */
export function tripIcsFileName(trip: IcsTrip): string {
  return `${tripIcsSlug(trip)}.${ICS_EXTENSION}`;
}

/**
 * Build the trip's .ics, write it to the cache directory and open the OS share
 * sheet. The cache directory is used (not document) because the file is a
 * disposable export artifact the system may reclaim.
 *
 * @returns the local `file://` URI of the written .ics.
 * @throws SharingUnavailableError when the platform cannot present a share sheet.
 */
export async function exportTripIcs(
  trip: IcsTrip,
  milestones: readonly IcsMilestone[],
): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new SharingUnavailableError();
  }

  const ics = buildIcs(trip, milestones);
  const file = new File(Paths.cache, tripIcsFileName(trip));
  // Overwrite any stale export from a previous run before writing.
  if (file.exists) file.delete();
  file.create();
  file.write(ics);

  await Sharing.shareAsync(file.uri, {
    mimeType: ICS_MIME_TYPE,
    UTI: 'public.calendar-event',
    dialogTitle: trip.name,
  });

  return file.uri;
}
