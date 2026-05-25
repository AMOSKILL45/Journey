import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, View } from 'react-native';

import { cn } from '@shared/utils/cn';

import { PixelText } from '../PixelText';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface PixelButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary-600', text: 'text-white', border: 'border-border' },
  secondary: { bg: 'bg-secondary-700', text: 'text-white', border: 'border-border' },
  accent: { bg: 'bg-accent-500', text: 'text-accent-700', border: 'border-border' },
  ghost: { bg: 'bg-transparent', text: 'text-text-primary', border: 'border-border' },
  danger: { bg: 'bg-error', text: 'text-white', border: 'border-border' },
};

const sizeClasses: Record<Size, { padX: string; padY: string; minH: string }> = {
  sm: { padX: 'px-3', padY: 'py-2', minH: 'min-h-[36px]' },
  md: { padX: 'px-5', padY: 'py-3', minH: 'min-h-[48px]' },
  lg: { padX: 'px-6', padY: 'py-4', minH: 'min-h-[56px]' },
};

const SPINNER_COLORS: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: '#FFFFFF',
  accent: '#0F1A2E',
  ghost: '#0F1A2E',
  danger: '#FFFFFF',
};

export const PixelButton = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  className,
  disabled,
  accessibilityLabel,
  ...rest
}: PixelButtonProps) => {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={accessibilityLabel}
      disabled={!isInteractive}
      {...rest}
    >
      {({ pressed }) => (
        <View
          className={cn(
            v.bg,
            v.border,
            s.padX,
            s.padY,
            s.minH,
            'flex-row items-center justify-center gap-2 rounded border-pixel',
            fullWidth && 'w-full',
            !isInteractive && 'opacity-40',
            pressed && isInteractive && 'translate-x-[2px] translate-y-[2px]',
            className,
          )}
          style={{
            shadowColor: '#0F1A2E',
            shadowOffset: {
              width: pressed && isInteractive ? 2 : 4,
              height: pressed && isInteractive ? 2 : 4,
            },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          }}
        >
          {loading ? (
            <ActivityIndicator color={SPINNER_COLORS[variant]} />
          ) : (
            <>
              {leftIcon}
              <PixelText size="body" family="heading" className={v.text}>
                {children}
              </PixelText>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
};
