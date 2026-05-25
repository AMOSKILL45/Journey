import { forwardRef } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import { cn } from '@shared/utils/cn';

import { PixelText } from '../PixelText';

export interface PixelInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  containerClassName?: string;
}

export const PixelInput = forwardRef<TextInput, PixelInputProps>(
  ({ label, helperText, errorText, required, containerClassName, ...inputProps }, ref) => {
    const hasError = Boolean(errorText);
    return (
      <View className={cn('w-full', containerClassName)}>
        {label && (
          <PixelText size="small" family="body-medium" className="mb-1 text-text-primary">
            {label} {required ? <PixelText className="text-error">*</PixelText> : null}
          </PixelText>
        )}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? inputProps.accessibilityLabel}
          accessibilityState={{ disabled: inputProps.editable === false }}
          placeholderTextColor="#A8B0BD"
          className={cn(
            'min-h-[48px] rounded border-pixel bg-surface px-3 py-2 font-body text-body text-text-primary',
            hasError ? 'border-error' : 'border-border',
            inputProps.editable === false && 'opacity-50',
          )}
          {...inputProps}
        />
        {hasError ? (
          <PixelText size="caption" className="mt-1 text-error">
            {errorText}
          </PixelText>
        ) : helperText ? (
          <PixelText size="caption" className="mt-1 text-text-secondary">
            {helperText}
          </PixelText>
        ) : null}
      </View>
    );
  },
);

PixelInput.displayName = 'PixelInput';
