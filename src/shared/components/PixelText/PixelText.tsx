import { ReactNode } from 'react';
import { Text, TextProps } from 'react-native';

import { cn } from '@shared/utils/cn';

type TextSize =
  | 'pixel'
  | 'caption'
  | 'small'
  | 'body'
  | 'lead'
  | 'h4'
  | 'h3'
  | 'h2'
  | 'h1'
  | 'display-lg'
  | 'display-xl';

type TextFamily =
  | 'pixel'
  | 'heading'
  | 'heading-bold'
  | 'body'
  | 'body-medium'
  | 'body-semibold'
  | 'body-bold';

export interface PixelTextProps extends TextProps {
  size?: TextSize;
  family?: TextFamily;
  className?: string;
  children: ReactNode;
}

const sizeClasses: Record<TextSize, string> = {
  pixel: 'text-pixel',
  caption: 'text-caption',
  small: 'text-small',
  body: 'text-body',
  lead: 'text-lead',
  h4: 'text-h4',
  h3: 'text-h3',
  h2: 'text-h2',
  h1: 'text-h1',
  'display-lg': 'text-display-lg',
  'display-xl': 'text-display-xl',
};

const familyClasses: Record<TextFamily, string> = {
  pixel: 'font-pixel',
  heading: 'font-heading',
  'heading-bold': 'font-heading-bold',
  body: 'font-body',
  'body-medium': 'font-body-medium',
  'body-semibold': 'font-body-semibold',
  'body-bold': 'font-body-bold',
};

const sizeToDefaultFamily: Record<TextSize, TextFamily> = {
  pixel: 'pixel',
  caption: 'body-medium',
  small: 'body',
  body: 'body',
  lead: 'body-medium',
  h4: 'heading',
  h3: 'heading',
  h2: 'heading',
  h1: 'heading-bold',
  'display-lg': 'heading-bold',
  'display-xl': 'heading-bold',
};

export const PixelText = ({
  size = 'body',
  family,
  className,
  children,
  ...rest
}: PixelTextProps) => {
  const resolvedFamily = family ?? sizeToDefaultFamily[size];
  return (
    <Text
      className={cn(
        sizeClasses[size],
        familyClasses[resolvedFamily],
        'text-text-primary',
        className,
      )}
      accessibilityRole="text"
      {...rest}
    >
      {children}
    </Text>
  );
};
