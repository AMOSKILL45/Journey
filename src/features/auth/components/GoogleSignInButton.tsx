import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { type ViewStyle } from 'react-native';

import { useAuth } from '../hooks/useAuth';

export interface GoogleSignInButtonProps {
  size?: number;
  color?: 'dark' | 'light';
  style?: ViewStyle;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

const DEFAULT_HEIGHT = 48;

export function GoogleSignInButton({
  size = GoogleSigninButton.Size.Wide,
  color = GoogleSigninButton.Color.Dark,
  style,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const { signInGoogle, pending } = useAuth();

  const handlePress = async () => {
    try {
      await signInGoogle();
      onSuccess?.();
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <GoogleSigninButton
      size={size}
      color={color}
      disabled={pending}
      style={[{ height: DEFAULT_HEIGHT, width: '100%' }, style]}
      onPress={handlePress}
    />
  );
}
