import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, ReactNode, useImperativeHandle, useMemo, useRef } from 'react';

import { colors } from '@core/theme';

export interface PixelBottomSheetRef {
  open: (snapIndex?: number) => void;
  close: () => void;
}

export interface PixelBottomSheetProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  scrollable?: boolean;
  enablePanDownToClose?: boolean;
  onChange?: (index: number) => void;
}

export const PixelBottomSheet = forwardRef<PixelBottomSheetRef, PixelBottomSheetProps>(
  ({ children, snapPoints, scrollable = true, enablePanDownToClose = true, onChange }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const resolvedSnaps = useMemo(() => snapPoints ?? ['50%', '90%'], [snapPoints]);

    useImperativeHandle(ref, () => ({
      open: (snapIndex = 0) => bottomSheetRef.current?.snapToIndex(snapIndex),
      close: () => bottomSheetRef.current?.close(),
    }));

    const Content = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={resolvedSnaps}
        enablePanDownToClose={enablePanDownToClose}
        onChange={onChange}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopWidth: 3,
          borderColor: colors.border,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary, width: 48, height: 4 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.55}
          />
        )}
      >
        <Content style={{ flex: 1, padding: 24 }}>{children}</Content>
      </BottomSheet>
    );
  },
);

PixelBottomSheet.displayName = 'PixelBottomSheet';
