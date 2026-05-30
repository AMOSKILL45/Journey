import { ExpoConfig, ConfigContext } from 'expo/config';

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

const corePlugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  'expo-font',
  [
    'expo-splash-screen',
    {
      // Native launch screen: the pixel-art mountain icon, small and centred on
      // cream. `imageWidth` must stay in sync with ICON_WIDTH in AnimatedSplash
      // so the native splash hands off to the JS dive overlay without a size jump.
      image: './src/assets/images/launch-icon.png',
      imageWidth: 160,
      resizeMode: 'contain',
      backgroundColor: '#FFF8EC',
    },
  ],
  'expo-apple-authentication',
  '@react-native-community/datetimepicker',
  '@sentry/react-native/expo',
  '@maplibre/maplibre-react-native',
];

if (googleIosUrlScheme) {
  corePlugins.push([
    '@react-native-google-signin/google-signin',
    { iosUrlScheme: googleIosUrlScheme },
  ]);
}

corePlugins.push([
  'expo-build-properties',
  {
    ios: { useFrameworks: 'static' },
    android: { compileSdkVersion: 35, targetSdkVersion: 35 },
  },
]);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'This Is The Journey',
  slug: 'this-is-the-journey',
  scheme: 'thisisthejourney',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/Icons/ios/AppIcon-AppStore-1024.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  updates: {
    url: 'https://u.expo.dev/4eebd598-ffdc-45e0-a938-971fa25bedd2',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    bundleIdentifier: 'com.thisisthejourney.app',
    supportsTablet: true,
    icon: './assets/Icons/ios/AppIcon-AppStore-1024.png',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'Used to center the map on your position while exploring your trips.',
      NSCameraUsageDescription:
        'Used to scan your ID document (passport, ID card or driving license) for identity verification.',
      NSPhotoLibraryUsageDescription:
        'Used to select an ID document photo from your library when scanning a fresh one is not possible.',
    },
    usesAppleSignIn: true,
  },
  android: {
    package: 'com.thisisthejourney.app',
    icon: './assets/Icons/android/ic_launcher_playstore-512.png',
    adaptiveIcon: {
      foregroundImage: './assets/Icons/android/adaptive/ic_launcher_foreground-432.png',
      backgroundImage: './assets/Icons/android/adaptive/ic_launcher_background-432.png',
      monochromeImage: './assets/Icons/android/adaptive/ic_launcher_monochrome-432.png',
      backgroundColor: '#FFF8EC',
    },
    edgeToEdgeEnabled: true,
  },
  plugins: corePlugins,
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // Hardcoded fallback because EAS CLI does NOT load .env when reading dynamic config,
      // so process.env.EAS_PROJECT_ID would be empty and EAS would refuse to link.
      projectId: process.env.EAS_PROJECT_ID ?? '4eebd598-ffdc-45e0-a938-971fa25bedd2',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    maptilerApiKey: process.env.EXPO_PUBLIC_MAPTILER_API_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
});
