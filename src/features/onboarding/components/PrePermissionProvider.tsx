import { useCallback, useEffect, useRef, useState } from 'react';

import type { PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';

import { type PermissionKind, registerPrePermissionHandler } from '../prePermission';

import { PrePermissionSheet } from './PrePermissionSheet';

/**
 * Mounts the single shared `PrePermissionSheet` near the app root and registers
 * the imperative `requestPrePermission(kind)` handler (10A). Non-React call
 * sites (notifications registration, location broadcast) await the handler; it
 * opens the sheet and resolves with the user's choice ("Allow" → true,
 * "Not now"/dismiss → false). One request at a time.
 */
export function PrePermissionProvider() {
  const sheetRef = useRef<PixelBottomSheetRef>(null);
  const resolverRef = useRef<((allowed: boolean) => void) | null>(null);
  const [kind, setKind] = useState<PermissionKind | null>(null);

  const settle = useCallback((allowed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setKind(null);
    if (resolve) resolve(allowed);
  }, []);

  const handleAllow = useCallback(() => {
    sheetRef.current?.close();
    settle(true);
  }, [settle]);

  const handleDismiss = useCallback(() => {
    // Fired by an explicit "Not now" tap or by the sheet closing (onChange -1).
    // Only resolves if a request is still pending (close() after Allow already
    // cleared the resolver), so the user choice is never double-counted.
    if (resolverRef.current) settle(false);
  }, [settle]);

  useEffect(() => {
    registerPrePermissionHandler(
      (next) =>
        new Promise<boolean>((resolve) => {
          // If a prior request somehow lingers, decline it before starting.
          if (resolverRef.current) resolverRef.current(false);
          resolverRef.current = resolve;
          setKind(next);
          sheetRef.current?.open();
        }),
    );
    return () => registerPrePermissionHandler(null);
  }, []);

  return (
    <PrePermissionSheet
      ref={sheetRef}
      kind={kind}
      onAllow={handleAllow}
      onDismiss={handleDismiss}
    />
  );
}
