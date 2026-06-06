import { useAgeGate } from '../hooks/useAgeGate';

import { AgeGateDialog } from './AgeGateDialog';

/**
 * Self-contained age gate (spec §6.3). Surfaces the confirmation dialog exactly once for a user
 * who has not yet confirmed, persisting the flag to `profiles.preferences`. Renders nothing while
 * the profile is loading or once confirmed, so it can be mounted unconditionally (e.g. on the
 * profile screen or post-sign-up) with no visual cost for confirmed users.
 */
export function AgeGate() {
  const { confirmed, isLoading, confirm } = useAgeGate();

  if (isLoading || confirmed) return null;

  return <AgeGateDialog visible loading={confirm.isPending} onConfirm={() => confirm.mutate()} />;
}
