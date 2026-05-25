# Sign-In Providers — Setup

The code for Apple + Google Sign-In is shipped (SIGNIN-1..4). To make the buttons actually work, complete the steps below in Apple Developer, Google Cloud Console, and the Supabase dashboard.

---

## Apple Sign-In

### Apple Developer Portal

1. **App ID**: under _Identifiers → App IDs_, find `com.thisisthejourney.app`. Enable the **"Sign in with Apple"** capability and save.
2. **Services ID** (used as the OAuth client ID for Supabase):
   - Create a new identifier of type _Services IDs_.
   - Identifier: `com.thisisthejourney.app.signin` (suggestion). Description: `This Is The Journey Web Sign-In`.
   - Enable _Sign in with Apple_. Configure:
     - Primary App ID: `com.thisisthejourney.app`
     - Domains and Subdomains: `ewsoupkfkachxidmuwoi.supabase.co`
     - Return URLs: `https://ewsoupkfkachxidmuwoi.supabase.co/auth/v1/callback`
3. **Key** (.p8) for signing the JWT Supabase exchanges:
   - _Keys → Create a key_. Name it `This Is The Journey Sign-In`. Enable _Sign in with Apple_. Configure → Primary App ID: `com.thisisthejourney.app`.
   - Download the `.p8` file (one-time download).
   - Note the **Key ID** (10 chars).
4. Note the **Team ID** (10 chars) — visible top-right of the developer portal.

### Supabase

Dashboard → _Authentication → Providers → Apple_:

- Enable.
- **Services ID**: the value from step 2 above (e.g. `com.thisisthejourney.app.signin`).
- **Secret key**: contents of the `.p8` file.
- **Team ID**: from step 4.
- **Key ID**: from step 3.
- Save.

### App side

No further action — `expo-apple-authentication` is wired and the button renders on iOS as soon as the provider is enabled.

---

## Google Sign-In

### Google Cloud Console

Project: pick or create a project (e.g. `this-is-the-journey`). Enable OAuth consent screen (External, public app type for production; Internal if Workspace-only is fine for testing).

Under _APIs & Services → Credentials_, create three OAuth 2.0 Client IDs:

1. **Web client** — used by Supabase to verify the ID token.
   - Type: Web application.
   - Authorized redirect URI: `https://ewsoupkfkachxidmuwoi.supabase.co/auth/v1/callback`.
   - Capture **Client ID** and **Client secret**.
2. **iOS client**:
   - Bundle ID: `com.thisisthejourney.app`.
   - Capture **Client ID** and the **iOS URL scheme** (it is the iOS Client ID reversed, e.g. `com.googleusercontent.apps.123-abc`).
3. **Android client**:
   - Package name: `com.thisisthejourney.app`.
   - SHA-1 fingerprint: get from EAS credentials with `eas credentials -p android` → "Keystore: SHA1 Certificate Fingerprint".
   - Capture **Client ID**.

### Supabase

Dashboard → _Authentication → Providers → Google_:

- Enable.
- **Client ID**: Web client ID from step 1.
- **Client secret**: Web client secret from step 1.
- (Optional) Authorized client IDs: paste iOS + Android client IDs (comma-separated) so tokens minted directly by mobile apps validate without bouncing through Supabase's web flow.
- Save.

### App side — local `.env`

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client ID from step 1>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<iOS client ID from step 2>
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=<reversed iOS client ID, e.g. com.googleusercontent.apps.123-abc>
```

After updating `.env`, rebuild the EAS dev client (the `iosUrlScheme` is a native config baked into the app at build time).

---

## TestFlight build

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

First build will prompt for Apple credentials. EAS managed credentials handles the Sign-in-with-Apple capability if the App ID has it enabled.
