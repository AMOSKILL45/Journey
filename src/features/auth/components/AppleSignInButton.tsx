import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { isAppleSignInAvailable } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

export interface AppleSignInButtonProps {
  style?: ViewStyle;
  cornerRadius?: number;
  buttonStyle?: AppleAuthentication.AppleAuthenticationButtonStyle;
  buttonType?: AppleAuthentication.AppleAuthenticationButtonType;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

const DEFAULT_HEIGHT = 48;
const DEFAULT_CORNER_RADIUS = 8;

export function AppleSignInButton({
  style,
  cornerRadius = DEFAULT_CORNER_RADIUS,
  buttonStyle = AppleAuthentication.AppleAuthenticationButtonStyle.BLACK,
  buttonType = AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
  onSuccess,
  onError,
}: AppleSignInButtonProps) {
  const { signInApple } = useAuth();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    void isAppleSignInAvailable().then((ok) => {
      if (mounted) setAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  const handlePress = async () => {
    try {
      await signInApple();
      onSuccess?.();
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={buttonType}
      buttonStyle={buttonStyle}
      cornerRadius={cornerRadius}
      style={[{ height: DEFAULT_HEIGHT, width: '100%' }, style]}
      onPress={handlePress}
    />
  );
}
