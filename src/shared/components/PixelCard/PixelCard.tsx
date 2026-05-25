import { ReactNode } from 'react';
import { Pressable, View, ViewProps } from 'react-native';

import { cn } from '@shared/utils/cn';

type Variant = 'default' | 'elevated' | 'flat';
type Padding = 'none' | 'sm' | 'md' | 'lg';

export interface PixelCardProps extends Omit<ViewProps, 'children' | 'style'> {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  padding?: Padding;
  className?: string;
}

const paddingClasses: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowFor = (variant: Variant, pressed: boolean) => {
  if (variant === 'flat') return { shadowOpacity: 0 };
  const base = variant === 'elevated' ? 6 : 4;
  const offset = pressed ? Math.max(2, base - 2) : base;
  return {
    shadowColor: '#0F1A2E',
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
  } as const;
};

export const PixelCard = ({
  children,
  onPress,
  variant = 'default',
  padding = 'md',
  className,
  accessibilityLabel,
  ...rest
}: PixelCardProps) => {
  const cardClasses = cn(
    'bg-surface rounded-md border-pixel border-border',
    paddingClasses[padding],
    className,
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {({ pressed }) => (
          <View
            className={cn(cardClasses, pressed && 'translate-x-[2px] translate-y-[2px]')}
            style={shadowFor(variant, pressed)}
          >
            {children}
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View
      className={cardClasses}
      style={shadowFor(variant, false)}
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      {children}
    </View>
  );
};
