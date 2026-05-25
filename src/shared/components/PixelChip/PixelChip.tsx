import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@shared/utils/cn';

import { PixelText } from '../PixelText';

type Variant = 'default' | 'accent';

export interface PixelChipProps {
  label: string;
  selected?: boolean;
  variant?: Variant;
  leftIcon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

export const PixelChip = ({
  label,
  selected = false,
  variant = 'default',
  leftIcon,
  onPress,
  disabled = false,
  className,
  accessibilityLabel,
}: PixelChipProps) => {
  const bgClass = selected
    ? variant === 'accent'
      ? 'bg-accent-500'
      : 'bg-primary-600'
    : 'bg-surface-alt';
  const textClass = selected
    ? variant === 'accent'
      ? 'text-accent-700'
      : 'text-white'
    : 'text-text-primary';

  const content = (
    <View
      className={cn(
        bgClass,
        'flex-row items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5',
        disabled && 'opacity-40',
        className,
      )}
    >
      {leftIcon}
      <PixelText size="small" family="body-medium" className={textClass}>
        {label}
      </PixelText>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
    >
      {content}
    </Pressable>
  );
};
