// Account & legal (Phase 10E). Delete/export flows, age gate, legal links, ghost display.
export { AccountSettings } from './components/AccountSettings';
export { DeleteAccountRow } from './components/DeleteAccountRow';
export { ExportDataRow } from './components/ExportDataRow';
export { LegalSection } from './components/LegalSection';
export { AgeGate } from './components/AgeGate';
export { AgeGateDialog } from './components/AgeGateDialog';

export { useDeleteAccount } from './hooks/useDeleteAccount';
export { useExportAccountData } from './hooks/useExportAccountData';
export { useAgeGate } from './hooks/useAgeGate';

export {
  deleteAccount,
  exportAccountData,
  exportAndShareAccountData,
  shareAccountExport,
  SharingUnavailableError,
  DELETE_ACCOUNT_FN,
  EXPORT_ACCOUNT_DATA_FN,
  type AccountExport,
  type DeleteAccountResult,
} from './api/account';

export { displayNameFor, isGhostUser, GHOST_USER_ID } from './utils/ghost';
export { isAgeConfirmed, withAgeConfirmed, AGE_CONFIRMED_KEY } from './utils/ageGate';
export { confirmWordForLocale, matchesConfirmWord } from './utils/confirmWord';
export { clearLocalCaches, CLEARED_STORAGE_KEYS } from './utils/clearLocalCaches';
