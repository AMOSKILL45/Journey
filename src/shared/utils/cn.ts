import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Custom tailwind-merge config that knows our custom font-size scale.
 * Without this, twMerge confuses size classes (text-h1, text-display-xl, etc.)
 * with text color classes (text-text-primary, text-primary-600, etc.).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'pixel',
            'caption',
            'small',
            'body',
            'lead',
            'h4',
            'h3',
            'h2',
            'h1',
            'display-lg',
            'display-xl',
          ],
        },
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
