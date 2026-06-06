import { useMutation } from '@tanstack/react-query';

import { setAudioSuppressed } from '@features/feedback';

import { exportAndShareAccountData } from '../api/account';

/**
 * Drive the GDPR data-export flow (spec §6.2): fetch the bundle from `export-account-data`, write
 * it to a JSON file, and open the OS share sheet. Returns the written `file://` URI. Sound is
 * suppressed for the duration (6C sensitive-flow guard). On failure the mutation rejects so the
 * caller can surface `account.export.error`.
 */
export function useExportAccountData() {
  return useMutation<string, Error, void>({
    mutationFn: async () => {
      setAudioSuppressed(true);
      try {
        return await exportAndShareAccountData();
      } finally {
        setAudioSuppressed(false);
      }
    },
  });
}
