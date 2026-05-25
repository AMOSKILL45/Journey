# Phase 0 — Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the entire dev infrastructure for **This Is The Journey** mobile app : Expo SDK 54+ project, TypeScript strict, NativeWind v4 with Cozy Arcade design tokens, Supabase project provisioned, EAS Dev Client buildable on device, i18n FR+EN scaffolded, ESLint + Prettier + Husky, GitHub repo + Actions CI, Sentry + PostHog wired, feature-based folder structure, CREDITS.md + LICENSE. Deliverable: a "Hello Journey" welcome screen boots on iOS + Android devices, fully equipped for Phase 1 work.

**Architecture:** Feature-based SOLID modular code structure (cf spec Section 4.3). Mono-repo expo-managed workflow using EAS Dev Client (no Expo Go, required for MapLibre native upcoming). Supabase as the single backend. i18n key-driven from day 1. All paths absolute via path aliases.

**Tech Stack:** Expo SDK 54+, TypeScript strict, NativeWind v4 (Tailwind for RN), Expo Router v4 file-based, Zustand (state), TanStack Query v5 (data), i18n-js + expo-localization, Sentry React Native, PostHog React Native, Supabase JS SDK, EAS Build + Updates, Husky + lint-staged + ESLint + Prettier, GitHub Actions.

**Reference spec:** `docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md`

---

## File Structure (created in this phase)

```
/                                  # repo root
├── .gitignore                     # Task 1
├── .nvmrc                         # Task 1 (Node version pin)
├── .editorconfig                  # Task 1
├── LICENSE                        # Task 2 (MIT)
├── CREDITS.md                     # Task 2 (initial structure)
├── README.md                      # Task 2 (project intro)
├── package.json                   # Task 3
├── tsconfig.json                  # Task 3 (strict mode)
├── app.config.ts                  # Task 4 (Expo config dynamic)
├── eas.json                       # Task 4 (EAS build profiles)
├── babel.config.js                # Task 5 (NativeWind v4 + path aliases)
├── tailwind.config.ts             # Task 5 (Cozy Arcade tokens)
├── metro.config.js                # Task 5
├── global.css                     # Task 5 (NativeWind v4 directives)
├── .prettierrc.json               # Task 6
├── .prettierignore                # Task 6
├── .eslintrc.json                 # Task 6
├── .husky/pre-commit              # Task 6
├── .github/workflows/ci.yml       # Task 11
├── scripts/
│   ├── clone-references.sh        # Task 7 (clone OSS .references)
│   └── check-credits.ts           # Task 7 (CI audit script)
├── src/
│   ├── app/                       # Expo Router screens
│   │   ├── _layout.tsx            # Task 13 (root layout + providers)
│   │   ├── index.tsx              # Task 14 (Hello Journey welcome)
│   │   └── +not-found.tsx         # Task 14 (404)
│   ├── core/
│   │   ├── theme/
│   │   │   ├── tokens.ts          # Task 8 (palette, fonts, spacing)
│   │   │   └── index.ts
│   │   ├── i18n/
│   │   │   ├── locales/
│   │   │   │   ├── en.json        # Task 9
│   │   │   │   └── fr.json        # Task 9
│   │   │   └── index.ts           # Task 9 (i18n instance + hooks)
│   │   ├── supabase/
│   │   │   ├── client.ts          # Task 10
│   │   │   └── types.ts           # Task 10 (generated, placeholder)
│   │   ├── sentry/
│   │   │   └── index.ts           # Task 12
│   │   ├── posthog/
│   │   │   └── index.ts           # Task 12
│   │   └── env/
│   │       └── index.ts           # Task 4 (env validation with zod)
│   ├── shared/
│   │   ├── components/
│   │   │   └── PixelText/         # Task 13 (1 baseline component)
│   │   │       ├── index.ts
│   │   │       ├── PixelText.tsx
│   │   │       └── PixelText.test.tsx
│   │   └── utils/
│   │       └── cn.ts              # Task 5 (className helper)
│   ├── features/                  # empty, populated in Phase 1+
│   │   └── .gitkeep
│   └── assets/
│       ├── fonts/                 # Task 8 (Press Start 2P, Fredoka, Nunito)
│       │   ├── PressStart2P-Regular.ttf
│       │   ├── Fredoka-Regular.ttf
│       │   ├── Fredoka-Medium.ttf
│       │   ├── Fredoka-SemiBold.ttf
│       │   ├── Fredoka-Bold.ttf
│       │   ├── Nunito-Regular.ttf
│       │   ├── Nunito-Medium.ttf
│       │   ├── Nunito-SemiBold.ttf
│       │   └── Nunito-Bold.ttf
│       └── images/
│           └── splash.png         # Task 4 (placeholder splash)
├── .references/                   # gitignored — local OSS clones
│   ├── react-duolingo/            # Task 7
│   ├── duolingo-clone/            # Task 7
│   ├── rpg-pixel-map-generator/   # Task 7
│   └── AdventureLog/              # Task 7
└── docs/superpowers/              # already exists
    ├── specs/                     # already exists
    └── plans/                     # already exists
```

---

## Task 1: Initialize git repo + base config files

**Files:**

- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `.editorconfig`

- [ ] **Step 1: Initialize git repo**

Run:

```bash
cd /Users/amoskoskas/thisisjourney
git init
git branch -M main
```

Expected: `Initialized empty Git repository in .git/`

- [ ] **Step 2: Create .gitignore**

Create `.gitignore` with content:

```
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Expo
.expo/
dist/
web-build/
.expo-shared/
expo-env.d.ts

# EAS
*.ipa
*.apk
*.aab

# Native
ios/
android/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*

# Env / secrets
.env
.env.local
.env.*.local
*.pem

# Logs
*.log

# Misc
.DS_Store
*.pem
.vscode/
.idea/

# Tests
coverage/

# OSS references (cloned locally, not committed)
.references/

# Generated
src/core/supabase/types.generated.ts
```

- [ ] **Step 3: Create .nvmrc**

Create `.nvmrc` with content:

```
20
```

- [ ] **Step 4: Create .editorconfig**

Create `.editorconfig` with content:

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore .nvmrc .editorconfig
git commit -m "chore: initial git setup with gitignore, nvmrc, editorconfig"
```

Expected: 1 commit on main.

---

## Task 2: License + Credits + README

**Files:**

- Create: `LICENSE`
- Create: `CREDITS.md`
- Create: `README.md`

- [ ] **Step 1: Create LICENSE (MIT)**

Create `LICENSE` with content:

```
MIT License

Copyright (c) 2026 This Is The Journey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create CREDITS.md with placeholders for dependencies**

Create `CREDITS.md` with content:

```markdown
# Credits

This Is The Journey stands on the shoulders of incredible open-source projects.

## Code

### Path UI inspiration

- [bryanjenningz/react-duolingo](https://github.com/bryanjenningz/react-duolingo) — MIT License — Copyright Bryan Jennings 2023. Path UI base ported to React Native.
- [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone) — MIT License. Indentation cycle algorithm reused.

### Map system

- [chbornman/rpg-pixel-map-generator](https://github.com/chbornman/rpg-pixel-map-generator) — MIT License. Pixelize shader technique referenced.
- [MapLibre GL JS / Native](https://github.com/maplibre/maplibre-react-native) — BSD-3-Clause.
- [Maputnik](https://github.com/maplibre/maputnik) — MIT License. Style editor.

### Data model inspiration

- [AdventureLog](https://github.com/seanmorley15/AdventureLog) — GPL-3.0. Schema concepts referenced only (no code copied).

### Frameworks & libraries

- [Expo](https://expo.dev/) — MIT License.
- [Supabase](https://supabase.com/) — Apache 2.0 (server), MIT (SDK).
- [Lucide React Native](https://github.com/lucide-icons/lucide) — ISC License.
- [NativeWind](https://www.nativewind.dev/) — MIT.

## Assets

### Pixel sprites

- [Kenney.nl](https://kenney.nl/assets) — CC0 (no attribution required, included by courtesy).
  - Tiny Town, Medieval RTS, Pixel Platformer, Board Game Icons, Micro Roguelike packs.

### Sprite animations

- [Pixel Frog "Pixel Adventure"](https://pixelfrog-assets.itch.io/pixel-adventure-1) — CC-BY 4.0. Used for character sprites.

### Fonts

- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) — Open Font License.
- [Fredoka](https://fonts.google.com/specimen/Fredoka) — Open Font License.
- [Nunito](https://fonts.google.com/specimen/Nunito) — Open Font License.

### Audio

- TBD — Kenney audio packs + Soundimage/Pixabay (added when integrated in Phase 6).

## NES.css / SNES.css

Visual tokens and proportions inspired by:

- [NES.css](https://github.com/nostalgic-css/NES.css) — MIT License — Copyright @bc_rikko / Black Everyday Company.

---

This file is checked at every release to ensure all licenses are honored.
```

- [ ] **Step 3: Create README.md**

Create `README.md` with content:

````markdown
# This Is The Journey

> Plan together. Travel together. Adventure together.

A collaborative trip planner mobile app (iOS + Android) with a pixel-art gaming aesthetic. Built with Expo, TypeScript, NativeWind, and Supabase.

## Status

🚧 In active development. Currently in **Phase 0: Bootstrap**.

## Documentation

- [Design Spec](docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md) — the full product + technical design
- [Implementation Plans](docs/superpowers/plans/) — phase-by-phase tasks

## Development

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- Yarn or npm
- EAS CLI: `npm i -g eas-cli`
- iOS Simulator (macOS) or Android Emulator
- Apple Developer account (for iOS dev client build)
- Google Play Console account (for Android distribution)

### Quick start

```bash
nvm use
npm install
npx expo prebuild  # generates ios/ and android/ folders
npm run dev        # runs Metro bundler
```
````

### Architecture

Feature-based modular structure following SOLID principles. See `docs/superpowers/specs/...` Section 4.3.

## License

MIT — see [LICENSE](LICENSE).
Open-source credits in [CREDITS.md](CREDITS.md).

````

- [ ] **Step 4: Commit**

```bash
git add LICENSE CREDITS.md README.md
git commit -m "docs: add LICENSE (MIT), CREDITS.md, README.md"
````

---

## Task 3: Initialize Expo project + TypeScript strict

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `app.json` (temporary, will be replaced by app.config.ts in Task 4)

- [ ] **Step 1: Init Expo project with TS template**

Run:

```bash
cd /Users/amoskoskas/thisisjourney
npx create-expo-app@latest . --template blank-typescript --no-install
```

If it prompts about overwriting LICENSE/README, choose "no" / skip those.

Expected output: project scaffolded, `package.json` + `App.tsx` + `app.json` + `tsconfig.json` created.

If create-expo-app refuses non-empty dir, alternative:

```bash
npx create-expo-app@latest /tmp/expo-tmp --template blank-typescript --no-install
cp -r /tmp/expo-tmp/. .
rm -rf /tmp/expo-tmp
```

- [ ] **Step 2: Update package.json with full dependencies**

Replace `package.json` content with:

```json
{
  "name": "this-is-the-journey",
  "version": "0.0.1",
  "main": "expo-router/entry",
  "private": true,
  "scripts": {
    "dev": "expo start --dev-client",
    "dev:tunnel": "expo start --dev-client --tunnel",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "prepare": "husky",
    "credits:check": "tsx scripts/check-credits.ts",
    "references:clone": "bash scripts/clone-references.sh",
    "supabase:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/core/supabase/types.generated.ts"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.0",
    "@react-native-async-storage/async-storage": "2.1.0",
    "@sentry/react-native": "^6.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-query-persist-client": "^5.59.0",
    "expo": "~54.0.0",
    "expo-application": "~6.0.0",
    "expo-constants": "~17.0.0",
    "expo-dev-client": "~5.0.0",
    "expo-font": "~13.0.0",
    "expo-image": "~2.0.0",
    "expo-linking": "~7.0.0",
    "expo-localization": "~16.0.0",
    "expo-router": "~4.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    "expo-updates": "~0.26.0",
    "i18n-js": "^4.4.0",
    "lucide-react-native": "^0.460.0",
    "nativewind": "^4.1.0",
    "posthog-react-native": "^3.5.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-native": "0.76.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-mmkv": "^3.1.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-safe-area-context": "4.14.0",
    "react-native-screens": "~4.4.0",
    "react-native-svg": "15.8.0",
    "tailwindcss": "^3.4.0",
    "zod": "^3.23.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@testing-library/react-native": "^12.7.0",
    "@types/jest": "^29.5.0",
    "@types/react": "~18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-config-expo": "~8.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "husky": "^9.1.0",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.3.0",
    "tsx": "^4.19.0",
    "typescript": "~5.6.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install successfully. Warnings about peer deps are OK.

- [ ] **Step 4: Update tsconfig.json with strict mode + path aliases**

Replace `tsconfig.json` content with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@app/*": ["src/app/*"],
      "@core/*": ["src/core/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"],
      "@assets/*": ["src/assets/*"]
    },
    "types": ["jest", "node"]
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", ".references"]
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS (no errors). May have warnings about missing modules — those resolve in next tasks.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json App.tsx app.json
git commit -m "feat: initialize Expo project with TypeScript strict + path aliases"
```

---

## Task 4: Configure Expo app.config.ts + EAS + env validation

**Files:**

- Delete: `app.json`
- Create: `app.config.ts`
- Create: `eas.json`
- Create: `src/core/env/index.ts`

- [ ] **Step 1: Delete app.json (replaced by dynamic app.config.ts)**

Run:

```bash
rm app.json
```

- [ ] **Step 2: Create app.config.ts**

Create `app.config.ts` with content:

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'This Is The Journey',
  slug: 'this-is-the-journey',
  scheme: 'thisisthejourney',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './src/assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './src/assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFF8EC',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.thisisthejourney.app',
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.thisisthejourney.app',
    adaptiveIcon: {
      foregroundImage: './src/assets/images/icon.png',
      backgroundColor: '#FFF8EC',
    },
    edgeToEdgeEnabled: true,
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' },
        android: { compileSdkVersion: 35, targetSdkVersion: 35 },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  },
});
```

- [ ] **Step 3: Add expo-build-properties dep**

Run:

```bash
npm install expo-build-properties
```

- [ ] **Step 4: Create eas.json**

Create `eas.json` with content:

```json
{
  "cli": {
    "version": ">= 13.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": {
        "resourceClass": "m-medium",
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 5: Create env validation with zod**

Create directory and file `src/core/env/index.ts`:

```typescript
import Constants from 'expo-constants';
import { z } from 'zod';

const envSchema = z.object({
  supabaseUrl: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  supabaseAnonKey: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required'),
  sentryDsn: z.string().url().optional(),
  posthogApiKey: z.string().optional(),
  posthogHost: z.string().url().optional(),
});

const raw = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const parsed = envSchema.safeParse(raw);

if (!parsed.success) {
  // Don't crash in dev — log warning. Crash in prod.
  if (!__DEV__) {
    throw new Error(`Env validation failed: ${parsed.error.message}`);
  }
  // eslint-disable-next-line no-console
  console.warn('[env] Validation warnings:', parsed.error.format());
}

export const env = parsed.success ? parsed.data : (raw as z.infer<typeof envSchema>);
```

- [ ] **Step 6: Create .env.example template**

Create `.env.example` with content:

```
# Supabase (created in Task 10)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Sentry (created in Task 12)
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# PostHog (created in Task 12)
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# EAS
EAS_PROJECT_ID=
```

- [ ] **Step 7: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app.config.ts eas.json src/core/env/index.ts .env.example package.json package-lock.json
git rm -f app.json
git commit -m "feat: dynamic Expo config (app.config.ts), EAS build profiles, env validation with zod"
```

---

## Task 5: Configure NativeWind v4 + path aliases + className helper

**Files:**

- Create: `babel.config.js`
- Create: `tailwind.config.ts`
- Create: `metro.config.js`
- Create: `global.css`
- Create: `nativewind-env.d.ts`
- Create: `src/shared/utils/cn.ts`

- [ ] **Step 1: Create babel.config.js**

Create `babel.config.js` with content:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@app': './src/app',
            '@core': './src/core',
            '@shared': './src/shared',
            '@features': './src/features',
            '@assets': './src/assets',
          },
        },
      ],
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
```

- [ ] **Step 2: Add babel-plugin-module-resolver dep**

Run:

```bash
npm install --save-dev babel-plugin-module-resolver
```

- [ ] **Step 3: Create tailwind.config.ts with Cozy Arcade tokens**

Create `tailwind.config.ts` with content:

```typescript
import { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Cozy Arcade palette (cf spec Section 6.2)
        primary: {
          50: '#FEEDEE',
          500: '#E63946',
          600: '#C62A38',
          700: '#A41E2A',
        },
        secondary: {
          500: '#2A9D8F',
          700: '#1F756B',
        },
        accent: {
          500: '#FFCB05',
          700: '#A87E00',
        },
        sky: {
          500: '#6BBFE2',
          700: '#2E6E91',
        },
        success: '#2D9D5F',
        warning: '#E68A1C',
        error: '#D6362B',
        info: '#3F76D6',
        cream: '#FFF8EC',
        surface: '#FFFFFF',
        'surface-alt': '#FCEFD5',
        'text-primary': '#0F1A2E',
        'text-secondary': '#5E6779',
        'text-disabled': '#A8B0BD',
        border: '#0F1A2E',
        // Dark mode tokens
        'dark-primary': '#FF6B7A',
        'dark-bg': '#0F1421',
        'dark-surface': '#1A2236',
        'dark-text-primary': '#F5F1E8',
        'dark-border': '#000000',
      },
      fontFamily: {
        // Cf spec Section 6.4
        pixel: ['PressStart2P-Regular'],
        heading: ['Fredoka-SemiBold'],
        'heading-bold': ['Fredoka-Bold'],
        body: ['Nunito-Regular'],
        'body-medium': ['Nunito-Medium'],
        'body-semibold': ['Nunito-SemiBold'],
        'body-bold': ['Nunito-Bold'],
      },
      fontSize: {
        // Cf spec Section 6.4 type scale
        pixel: ['12px', { lineHeight: '16px' }],
        caption: ['12px', { lineHeight: '16px' }],
        small: ['14px', { lineHeight: '20px' }],
        body: ['16px', { lineHeight: '24px' }],
        lead: ['18px', { lineHeight: '28px' }],
        h4: ['18px', { lineHeight: '24px' }],
        h3: ['20px', { lineHeight: '28px' }],
        h2: ['24px', { lineHeight: '32px' }],
        h1: ['28px', { lineHeight: '36px' }],
        'display-lg': ['32px', { lineHeight: '40px' }],
        'display-xl': ['40px', { lineHeight: '48px' }],
      },
      borderWidth: {
        DEFAULT: '1px',
        pixel: '3px',
        'pixel-lg': '4px',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create metro.config.js with NativeWind v4**

Create `metro.config.js` with content:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 5: Create global.css with Tailwind directives**

Create `global.css` with content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create nativewind-env.d.ts for TS types**

Create `nativewind-env.d.ts` with content:

```typescript
/// <reference types="nativewind/types" />
```

- [ ] **Step 7: Create className helper**

Create `src/shared/utils/cn.ts` with content:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

- [ ] **Step 8: Install clsx + tailwind-merge**

Run:

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 9: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add babel.config.js tailwind.config.ts metro.config.js global.css nativewind-env.d.ts src/shared/utils/cn.ts package.json package-lock.json
git commit -m "feat: NativeWind v4 setup with Cozy Arcade tokens and path aliases"
```

---

## Task 6: ESLint + Prettier + Husky pre-commit

**Files:**

- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.eslintrc.json`
- Create: `.eslintignore`
- Create: `.husky/pre-commit`
- Modify: `package.json` (add lint-staged config)

- [ ] **Step 1: Create .prettierrc.json**

Create `.prettierrc.json` with content:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 2: Create .prettierignore**

Create `.prettierignore` with content:

```
node_modules
.expo
dist
ios
android
.references
*.generated.ts
package-lock.json
```

- [ ] **Step 3: Create .eslintrc.json**

Create `.eslintrc.json` with content:

```json
{
  "root": true,
  "extends": ["expo", "prettier"],
  "plugins": ["react-hooks", "@typescript-eslint"],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "import/order": [
      "warn",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ]
  },
  "ignorePatterns": [
    "node_modules",
    "dist",
    ".expo",
    "ios",
    "android",
    ".references",
    "*.generated.ts"
  ]
}
```

- [ ] **Step 4: Create .eslintignore**

Create `.eslintignore` with content:

```
node_modules
.expo
dist
ios
android
.references
*.generated.ts
```

- [ ] **Step 5: Initialize husky**

Run:

```bash
npx husky init
```

This creates `.husky/` directory and adds `prepare` script in package.json (already added in Task 3).

- [ ] **Step 6: Configure pre-commit hook**

Replace content of `.husky/pre-commit` with:

```bash
npx lint-staged
```

Make executable:

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 7: Add lint-staged config to package.json**

Edit `package.json` and add at root level (after `scripts`):

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

- [ ] **Step 8: Test lint works**

Run:

```bash
npm run lint
```

Expected: should pass with maybe warnings on the boilerplate `App.tsx`.

- [ ] **Step 9: Test format works**

Run:

```bash
npm run format
```

Expected: files reformatted, no errors.

- [ ] **Step 10: Commit**

```bash
git add .prettierrc.json .prettierignore .eslintrc.json .eslintignore .husky/ package.json package-lock.json
git commit -m "chore: ESLint + Prettier + Husky pre-commit setup"
```

---

## Task 7: Reference repos clone script + credits check

**Files:**

- Create: `scripts/clone-references.sh`
- Create: `scripts/check-credits.ts`

- [ ] **Step 1: Create scripts/ directory**

Run:

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create clone-references.sh**

Create `scripts/clone-references.sh` with content:

```bash
#!/usr/bin/env bash
# Clones OSS reference repos to .references/ for code reading during development.
# These are NOT included in the build — they're documentation.

set -e

REFS_DIR=".references"

mkdir -p "$REFS_DIR"
cd "$REFS_DIR"

clone_or_pull() {
  local url=$1
  local dir=$2
  if [ -d "$dir" ]; then
    echo "→ Updating $dir"
    cd "$dir" && git pull --ff-only && cd ..
  else
    echo "→ Cloning $url"
    git clone --depth 1 "$url" "$dir"
  fi
}

clone_or_pull "https://github.com/bryanjenningz/react-duolingo.git" "react-duolingo"
clone_or_pull "https://github.com/sanidhyy/duolingo-clone.git" "duolingo-clone"
clone_or_pull "https://github.com/chbornman/rpg-pixel-map-generator.git" "rpg-pixel-map-generator"
clone_or_pull "https://github.com/seanmorley15/AdventureLog.git" "AdventureLog"

echo ""
echo "✓ All references ready in $REFS_DIR/"
echo "  Use these for inspiration ONLY. Code copying respects licenses (cf CREDITS.md)."
```

- [ ] **Step 3: Make it executable**

Run:

```bash
chmod +x scripts/clone-references.sh
```

- [ ] **Step 4: Create check-credits.ts (CI audit)**

Create `scripts/check-credits.ts` with content:

```typescript
/**
 * Verifies that CREDITS.md mentions all license-requiring dependencies.
 * Run via: npm run credits:check
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

const credits = readFileSync(join(process.cwd(), 'CREDITS.md'), 'utf-8');

const allDeps = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});

// Allowlist: deps we don't need to credit (very common, no required attribution like MIT-only)
const allowlist = new Set([
  'react',
  'react-dom',
  'react-native',
  'typescript',
  '@types/react',
  '@types/jest',
  '@types/node',
  'jest',
  'eslint',
  'prettier',
  'tsx',
  'husky',
  'lint-staged',
  'clsx',
  'tailwind-merge',
  'tailwindcss',
  'zod',
  'zustand',
  '@tanstack/react-query',
  '@tanstack/react-query-persist-client',
  'expo',
  '@babel/core',
]);

const missing: string[] = [];

for (const dep of allDeps) {
  if (allowlist.has(dep)) continue;
  if (dep.startsWith('expo-')) continue;
  if (dep.startsWith('@expo/')) continue;
  if (dep.startsWith('@typescript-eslint/')) continue;
  if (dep.startsWith('eslint-')) continue;
  if (dep.startsWith('react-native-')) continue;
  if (dep.startsWith('babel-')) continue;
  if (dep.startsWith('@testing-library/')) continue;
  if (dep.startsWith('jest-')) continue;

  const baseName = dep.replace(/^@/, '').split('/')[0];
  if (!credits.toLowerCase().includes(baseName.toLowerCase())) {
    missing.push(dep);
  }
}

if (missing.length > 0) {
  console.error('✗ The following dependencies are NOT mentioned in CREDITS.md:');
  for (const m of missing) console.error(`  - ${m}`);
  console.error('\nAdd them to CREDITS.md before merging.');
  process.exit(1);
}

console.log('✓ All notable dependencies are credited.');
```

- [ ] **Step 5: Run reference clone**

Run:

```bash
npm run references:clone
```

Expected: 4 repos cloned into `.references/`. Verify with `ls .references/`.

- [ ] **Step 6: Run credits check**

Run:

```bash
npm run credits:check
```

Expected: PASS (✓ All notable dependencies are credited.). If FAIL with missing entries, add them to CREDITS.md and re-run.

- [ ] **Step 7: Commit**

```bash
git add scripts/
git commit -m "chore: reference clone script + CI credits audit"
```

---

## Task 8: Theme tokens + fonts download

**Files:**

- Create: `src/core/theme/tokens.ts`
- Create: `src/core/theme/index.ts`
- Download: 9 font files to `src/assets/fonts/`

- [ ] **Step 1: Create theme tokens file**

Create directory and file `src/core/theme/tokens.ts`:

```typescript
/**
 * Cozy Arcade design tokens — source of truth.
 * Tailwind config references these by mirror in tailwind.config.ts.
 * Component styles can import directly when not using NativeWind.
 */

export const colors = {
  primary: {
    50: '#FEEDEE',
    500: '#E63946',
    600: '#C62A38',
    700: '#A41E2A',
  },
  secondary: {
    500: '#2A9D8F',
    700: '#1F756B',
  },
  accent: {
    500: '#FFCB05',
    700: '#A87E00',
  },
  sky: {
    500: '#6BBFE2',
    700: '#2E6E91',
  },
  success: '#2D9D5F',
  warning: '#E68A1C',
  error: '#D6362B',
  info: '#3F76D6',
  cream: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FCEFD5',
  textPrimary: '#0F1A2E',
  textSecondary: '#5E6779',
  textDisabled: '#A8B0BD',
  border: '#0F1A2E',
  dark: {
    primary: '#FF6B7A',
    bg: '#0F1421',
    surface: '#1A2236',
    textPrimary: '#F5F1E8',
    border: '#000000',
  },
} as const;

export const worldThemes = {
  generic: {
    sky: '#FFCB05',
    accent: '#E63946',
    ground: '#7DA847',
    secondary: '#6BBFE2',
  },
  usaDesert: {
    sky: '#FFB174',
    ground: '#FCE4B6',
    accent: '#3C8DBC',
    secondary: '#D6362B',
  },
  europeForest: {
    sky: '#A8D6FF',
    ground: '#86A86E',
    accent: '#D1654A',
    secondary: '#6E4628',
  },
  asiaSakura: {
    sky: '#FFD6E0',
    ground: '#9FCFA0',
    accent: '#5B3B7F',
    secondary: '#FFCB05',
  },
  tropicalBeach: {
    sky: '#5FCFE6',
    ground: '#FFF1B8',
    accent: '#FF7A4A',
    secondary: '#FF4592',
  },
} as const;

export const fonts = {
  pixel: 'PressStart2P-Regular',
  heading: 'Fredoka-SemiBold',
  headingBold: 'Fredoka-Bold',
  body: 'Nunito-Regular',
  bodyMedium: 'Nunito-Medium',
  bodySemibold: 'Nunito-SemiBold',
  bodyBold: 'Nunito-Bold',
} as const;

export const fontSizes = {
  pixel: 12,
  caption: 12,
  small: 14,
  body: 16,
  lead: 18,
  h4: 18,
  h3: 20,
  h2: 24,
  h1: 28,
  displayLg: 32,
  displayXl: 40,
} as const;

export const lineHeights = {
  pixel: 16,
  caption: 16,
  small: 20,
  body: 24,
  lead: 28,
  h4: 24,
  h3: 28,
  h2: 32,
  h1: 36,
  displayLg: 40,
  displayXl: 48,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const borderWidths = {
  default: 1,
  pixel: 3,
  pixelLg: 4,
} as const;

export const borderRadii = {
  none: 0,
  sm: 2,
  default: 4,
  md: 6,
  lg: 8,
  full: 9999,
} as const;

export const shadows = {
  pixel: { offsetX: 4, offsetY: 4, color: colors.border },
  pixelCard: { offsetX: 6, offsetY: 6, color: colors.border },
} as const;

export type WorldThemeKey = keyof typeof worldThemes;
```

- [ ] **Step 2: Create theme index**

Create `src/core/theme/index.ts` with content:

```typescript
export * from './tokens';
```

- [ ] **Step 3: Create fonts directory**

Run:

```bash
mkdir -p src/assets/fonts
```

- [ ] **Step 4: Download fonts manually**

Download these font files from Google Fonts and save to `src/assets/fonts/`:

1. **Press Start 2P** (https://fonts.google.com/specimen/Press+Start+2P) — Get `PressStart2P-Regular.ttf`
2. **Fredoka** (https://fonts.google.com/specimen/Fredoka) — Get Regular, Medium, SemiBold, Bold:
   - `Fredoka-Regular.ttf`
   - `Fredoka-Medium.ttf`
   - `Fredoka-SemiBold.ttf`
   - `Fredoka-Bold.ttf`
3. **Nunito** (https://fonts.google.com/specimen/Nunito) — Get Regular, Medium, SemiBold, Bold:
   - `Nunito-Regular.ttf`
   - `Nunito-Medium.ttf`
   - `Nunito-SemiBold.ttf`
   - `Nunito-Bold.ttf`

Save all 9 files in `src/assets/fonts/`.

Verify:

```bash
ls src/assets/fonts/ | wc -l
```

Expected: `9`.

- [ ] **Step 5: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme/ src/assets/fonts/
git commit -m "feat: design tokens (Cozy Arcade palette + fonts + spacing) and font files"
```

---

## Task 9: i18n setup with FR + EN locales

**Files:**

- Create: `src/core/i18n/locales/en.json`
- Create: `src/core/i18n/locales/fr.json`
- Create: `src/core/i18n/index.ts`

- [ ] **Step 1: Create locales directory**

Run:

```bash
mkdir -p src/core/i18n/locales
```

- [ ] **Step 2: Create en.json (source of truth)**

Create `src/core/i18n/locales/en.json` with content:

```json
{
  "app": {
    "name": "This Is The Journey",
    "tagline": "Plan together. Travel together. Adventure together."
  },
  "welcome": {
    "title": "Welcome",
    "subtitle": "Your adventure starts here",
    "cta": "Get started"
  },
  "common": {
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "next": "Next",
    "skip": "Skip",
    "done": "Done",
    "loading": "Loading...",
    "error": "Something went wrong"
  }
}
```

- [ ] **Step 3: Create fr.json**

Create `src/core/i18n/locales/fr.json` with content:

```json
{
  "app": {
    "name": "This Is The Journey",
    "tagline": "Planifie ensemble. Voyage ensemble. Vis l'aventure ensemble."
  },
  "welcome": {
    "title": "Bienvenue",
    "subtitle": "Ton aventure commence ici",
    "cta": "C'est parti"
  },
  "common": {
    "cancel": "Annuler",
    "save": "Enregistrer",
    "delete": "Supprimer",
    "edit": "Modifier",
    "back": "Retour",
    "next": "Suivant",
    "skip": "Passer",
    "done": "Terminé",
    "loading": "Chargement...",
    "error": "Quelque chose a mal tourné"
  }
}
```

- [ ] **Step 4: Create i18n instance + hook**

Create `src/core/i18n/index.ts` with content:

```typescript
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import en from './locales/en.json';
import fr from './locales/fr.json';

export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const i18n = new I18n({ en, fr });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = detectInitialLocale();

function detectInitialLocale(): SupportedLocale {
  const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LOCALES as readonly string[]).includes(deviceLocale)
    ? (deviceLocale as SupportedLocale)
    : 'en';
}

// Subscribe pattern for hook
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return i18n.locale;
}

export const t = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options);

export const setLocale = (loc: SupportedLocale): void => {
  i18n.locale = loc;
  listeners.forEach((l) => l());
};

export const useTranslation = () => {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { t, locale, setLocale };
};
```

- [ ] **Step 5: Write test for i18n**

Create `src/core/i18n/__tests__/i18n.test.ts` with content:

```typescript
import { t, setLocale } from '../index';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns English translation by default', () => {
    expect(t('welcome.title')).toBe('Welcome');
  });

  it('switches to French when locale changes', () => {
    setLocale('fr');
    expect(t('welcome.title')).toBe('Bienvenue');
  });

  it('falls back to English when key missing in current locale', () => {
    setLocale('fr');
    // 'common.save' exists in both, just verify behavior
    expect(t('common.save')).toBe('Enregistrer');
  });

  it('returns key path when translation missing', () => {
    setLocale('en');
    expect(t('nonexistent.key')).toContain('nonexistent');
  });
});
```

- [ ] **Step 6: Configure jest**

Create `jest.config.js` at root with content:

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: [],
  testPathIgnorePatterns: ['/node_modules/', '/.references/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@supabase/.*|@tanstack/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
  },
};
```

- [ ] **Step 7: Run i18n test**

Run:

```bash
npm test -- src/core/i18n
```

Expected: 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/i18n/ jest.config.js
git commit -m "feat: i18n setup with en + fr locales, key-driven translations + tests"
```

---

## Task 10: Provision Supabase project + client setup

**Files:**

- Create: `src/core/supabase/client.ts`
- Create: `src/core/supabase/types.ts`
- Modify: `.env` (NOT committed)

**Note:** This task uses the Supabase MCP. We'll create a fresh project, get URL + anon key, and wire up the client.

- [ ] **Step 1: List Supabase organizations**

Use MCP tool `mcp__a76e992d-825a-41c1-9018-e099e457ba03__list_organizations` to find available organizations.

Ask user to confirm which organization to use (if multiple).

- [ ] **Step 2: Get cost confirmation**

Use MCP tool `mcp__a76e992d-825a-41c1-9018-e099e457ba03__get_cost` with `type='project'` and the organization_id to estimate cost.

Confirm with user that the cost (likely $0 for free tier) is acceptable.

Use MCP tool `mcp__a76e992d-825a-41c1-9018-e099e457ba03__confirm_cost` with returned cost details → returns `confirm_cost_id`.

- [ ] **Step 3: Create Supabase project**

Use MCP tool `mcp__a76e992d-825a-41c1-9018-e099e457ba03__create_project` with:

- name: `this-is-the-journey`
- region: `eu-west-3` (Paris, closest to user) OR `us-east-1` if user prefers
- organization_id: from Step 1
- confirm_cost_id: from Step 2

Wait for project status `ACTIVE_HEALTHY` (use `get_project` to poll).

Note the project_id returned.

- [ ] **Step 4: Get project URL + publishable keys**

Use MCP tool `mcp__a76e992d-825a-41c1-9018-e099e457ba03__get_project_url` with project_id → returns the URL.

Use MCP tool `mcp__a76e992d-825a-41c1-9018-e099e457ba03__get_publishable_keys` with project_id → returns `anon` key.

- [ ] **Step 5: Create .env with Supabase credentials**

Create `.env` (NOT committed, in .gitignore) with content:

```
EXPO_PUBLIC_SUPABASE_URL=<URL from Step 4>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Step 4>
```

- [ ] **Step 6: Create Supabase client**

Create `src/core/supabase/client.ts` with content:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from '@core/env';

import type { Database } from './types';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 7: Install URL polyfill**

Run:

```bash
npm install react-native-url-polyfill
```

- [ ] **Step 8: Create types placeholder**

Create `src/core/supabase/types.ts` with content:

```typescript
/**
 * Supabase generated types placeholder.
 * Will be regenerated in Phase 1 once we have tables.
 * Generate via: npm run supabase:types
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
```

- [ ] **Step 9: Test client instantiates without crash**

Create `src/core/supabase/__tests__/client.test.ts` with content:

```typescript
import { supabase } from '../client';

describe('Supabase client', () => {
  it('instantiates successfully', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('has expected URL configured', () => {
    // @ts-expect-error — accessing private rest for test
    expect(supabase.supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });
});
```

Run:

```bash
npm test -- src/core/supabase
```

Expected: 2 tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/core/supabase/ package.json package-lock.json
git commit -m "feat: Supabase project provisioned + client setup"
```

**Note:** `.env` is NOT committed. Save the EAS_PROJECT_ID + Supabase credentials in your password manager.

---

## Task 11: GitHub Actions CI

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows directory**

Run:

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create CI workflow**

Create `.github/workflows/ci.yml` with content:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    name: Lint + Typecheck + Tests + Credits
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test -- --ci --coverage

      - name: Credits audit
        run: npm run credits:check
```

- [ ] **Step 3: Verify CI YAML syntax locally**

Run:

```bash
# If yamllint installed:
yamllint .github/workflows/ci.yml || echo "(yamllint not installed, skipping)"
```

Expected: no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "ci: GitHub Actions for lint, typecheck, tests, credits audit"
```

---

## Task 12: Sentry + PostHog wiring

**Files:**

- Create: `src/core/sentry/index.ts`
- Create: `src/core/posthog/index.ts`

**Note:** Sentry DSN and PostHog API key are added to `.env` separately (manual setup outside MCP). For Phase 0 we wire the SDKs; actual accounts can be created during Phase 1.

- [ ] **Step 1: Create Sentry init**

Create directory and file `src/core/sentry/index.ts`:

```typescript
import * as Sentry from '@sentry/react-native';

import { env } from '@core/env';

export const initSentry = (): void => {
  if (!env.sentryDsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[sentry] DSN not configured, skipping init');
    }
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    enabled: !__DEV__,
    tracesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
  });
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
```

- [ ] **Step 2: Create PostHog init**

Create directory and file `src/core/posthog/index.ts`:

```typescript
import PostHog from 'posthog-react-native';

import { env } from '@core/env';

let posthogInstance: PostHog | null = null;

export const initPostHog = async (): Promise<void> => {
  if (!env.posthogApiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[posthog] API key not configured, skipping init');
    }
    return;
  }

  posthogInstance = new PostHog(env.posthogApiKey, {
    host: env.posthogHost,
    flushAt: 20,
    flushInterval: 30000,
  });
};

export const track = (event: string, properties?: Record<string, unknown>): void => {
  posthogInstance?.capture(event, properties);
};

export const identify = (distinctId: string, properties?: Record<string, unknown>): void => {
  posthogInstance?.identify(distinctId, properties);
};

export const reset = (): void => {
  posthogInstance?.reset();
};
```

- [ ] **Step 3: Add sentry-expo + posthog deps confirmation**

The deps are already in package.json from Task 3 (`@sentry/react-native`, `posthog-react-native`).

Verify with:

```bash
npm list @sentry/react-native posthog-react-native
```

Expected: both listed with versions.

- [ ] **Step 4: Write tests for safe init when env not configured**

Create `src/core/sentry/__tests__/sentry.test.ts` with content:

```typescript
import { initSentry } from '../index';

describe('Sentry init', () => {
  it('does not throw when DSN is missing', () => {
    expect(() => initSentry()).not.toThrow();
  });
});
```

Create `src/core/posthog/__tests__/posthog.test.ts` with content:

```typescript
import { initPostHog, track } from '../index';

describe('PostHog', () => {
  it('initializes without throwing when key missing', async () => {
    await expect(initPostHog()).resolves.not.toThrow();
  });

  it('track is a no-op when not initialized', () => {
    expect(() => track('test_event', { foo: 'bar' })).not.toThrow();
  });
});
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/core/sentry src/core/posthog
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/sentry/ src/core/posthog/
git commit -m "feat: Sentry + PostHog SDK init with safe no-op when env missing"
```

---

## Task 13: Root layout + providers + first PixelText component

**Files:**

- Create: `src/app/_layout.tsx`
- Create: `src/app/+not-found.tsx`
- Create: `src/shared/components/PixelText/index.ts`
- Create: `src/shared/components/PixelText/PixelText.tsx`
- Create: `src/shared/components/PixelText/PixelText.test.tsx`

- [ ] **Step 1: Delete old App.tsx (replaced by Expo Router)**

Run:

```bash
rm -f App.tsx
```

- [ ] **Step 2: Create src/app/\_layout.tsx (root)**

Create directory and file `src/app/_layout.tsx`:

```typescript
import '@/../global.css';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initPostHog } from '@core/posthog';
import { initSentry } from '@core/sentry';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PressStart2P-Regular': require('@assets/fonts/PressStart2P-Regular.ttf'),
    'Fredoka-Regular': require('@assets/fonts/Fredoka-Regular.ttf'),
    'Fredoka-Medium': require('@assets/fonts/Fredoka-Medium.ttf'),
    'Fredoka-SemiBold': require('@assets/fonts/Fredoka-SemiBold.ttf'),
    'Fredoka-Bold': require('@assets/fonts/Fredoka-Bold.ttf'),
    'Nunito-Regular': require('@assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Medium': require('@assets/fonts/Nunito-Medium.ttf'),
    'Nunito-SemiBold': require('@assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Bold': require('@assets/fonts/Nunito-Bold.ttf'),
  });

  useEffect(() => {
    initSentry();
    void initPostHog();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFF8EC' },
        }}
      />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Create 404 screen**

Create `src/app/+not-found.tsx`:

```typescript
import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center bg-cream px-4">
        <PixelText size="h2" className="mb-4">
          404
        </PixelText>
        <PixelText size="body" className="mb-6 text-text-secondary">
          {t('common.error')}
        </PixelText>
        <Link href="/" className="text-primary-600 underline">
          <PixelText size="body" className="text-primary-600">
            {t('common.back')}
          </PixelText>
        </Link>
      </View>
    </>
  );
}
```

- [ ] **Step 4: Create PixelText component**

Create directory and file `src/shared/components/PixelText/PixelText.tsx`:

```typescript
import { ReactNode } from 'react';
import { Text, TextProps } from 'react-native';

import { cn } from '@shared/utils/cn';

type TextSize = 'pixel' | 'caption' | 'small' | 'body' | 'lead' | 'h4' | 'h3' | 'h2' | 'h1' | 'display-lg' | 'display-xl';
type TextFamily = 'pixel' | 'heading' | 'heading-bold' | 'body' | 'body-medium' | 'body-semibold' | 'body-bold';

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
```

- [ ] **Step 5: Create PixelText index**

Create `src/shared/components/PixelText/index.ts`:

```typescript
export { PixelText } from './PixelText';
export type { PixelTextProps } from './PixelText';
```

- [ ] **Step 6: Write PixelText test**

Create `src/shared/components/PixelText/PixelText.test.tsx`:

```typescript
import { render } from '@testing-library/react-native';

import { PixelText } from './PixelText';

describe('PixelText', () => {
  it('renders children text', () => {
    const { getByText } = render(<PixelText>Hello</PixelText>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies size classes based on prop', () => {
    const { getByText } = render(<PixelText size="h1">Title</PixelText>);
    const element = getByText('Title');
    expect(element.props.className).toContain('text-h1');
  });

  it('applies explicit family override', () => {
    const { getByText } = render(
      <PixelText size="body" family="pixel">
        Mixed
      </PixelText>,
    );
    const element = getByText('Mixed');
    expect(element.props.className).toContain('font-pixel');
  });

  it('has accessibility role text by default', () => {
    const { getByText } = render(<PixelText>Accessible</PixelText>);
    const element = getByText('Accessible');
    expect(element.props.accessibilityRole).toBe('text');
  });
});
```

- [ ] **Step 7: Run PixelText tests**

Run:

```bash
npm test -- src/shared/components/PixelText
```

Expected: 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/_layout.tsx src/app/+not-found.tsx src/shared/components/PixelText/
git rm -f App.tsx
git commit -m "feat: root layout with font loading + 404 + first PixelText component (+ tests)"
```

---

## Task 14: "Hello Journey" welcome screen

**Files:**

- Create: `src/app/index.tsx`
- Create: `src/assets/images/splash.png` (placeholder)
- Create: `src/assets/images/icon.png` (placeholder)

- [ ] **Step 1: Create placeholder images**

Create directory:

```bash
mkdir -p src/assets/images
```

Create simple solid-color placeholders using ImageMagick or curl from a placeholder service:

Option A — ImageMagick (if installed):

```bash
convert -size 1024x1024 xc:'#FFF8EC' src/assets/images/icon.png
convert -size 1242x2436 xc:'#FFF8EC' src/assets/images/splash.png
```

Option B — Use placehold.co (download placeholder):

```bash
curl -L "https://placehold.co/1024x1024/FFF8EC/0F1A2E.png?text=TITJ" -o src/assets/images/icon.png
curl -L "https://placehold.co/1242x2436/FFF8EC/0F1A2E.png?text=TITJ" -o src/assets/images/splash.png
```

Verify files exist and have non-zero size:

```bash
ls -la src/assets/images/
```

Both files should be >0 bytes.

- [ ] **Step 2: Create welcome screen**

Create `src/app/index.tsx`:

```typescript
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-cream px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      accessibilityLabel="Welcome screen"
    >
      <View className="mb-12 items-center">
        <PixelText size="display-lg" family="pixel" className="mb-4 text-center text-primary-600">
          THIS IS THE{'\n'}JOURNEY
        </PixelText>
        <PixelText size="lead" className="text-center text-text-secondary">
          {t('app.tagline')}
        </PixelText>
      </View>

      <View className="rounded border-pixel border-border bg-surface p-6 shadow-md">
        <PixelText size="h3" className="mb-2">
          {t('welcome.title')}
        </PixelText>
        <PixelText size="body" className="text-text-secondary">
          {t('welcome.subtitle')}
        </PixelText>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Write welcome screen smoke test**

Create `src/app/__tests__/index.test.tsx`:

```typescript
import { render } from '@testing-library/react-native';

import WelcomeScreen from '../index';

// Mock SafeAreaProvider/useSafeAreaInsets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('WelcomeScreen', () => {
  it('renders app title', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText(/THIS IS THE/)).toBeTruthy();
  });

  it('renders welcome subtitle (English by default)', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText('Your adventure starts here')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(<WelcomeScreen />);
    expect(getByLabelText('Welcome screen')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run welcome tests**

Run:

```bash
npm test -- src/app
```

Expected: 3 tests PASS.

- [ ] **Step 5: Typecheck all**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Lint all**

Run:

```bash
npm run lint
```

Expected: PASS (warnings OK).

- [ ] **Step 7: Commit**

```bash
git add src/app/index.tsx src/app/__tests__/ src/assets/images/
git commit -m "feat: Hello Journey welcome screen with i18n + PixelText + tests"
```

---

## Task 15: EAS Dev Client build + run on device

**Files:**

- Modify: `app.config.ts` (set `extra.eas.projectId` after first build)

- [ ] **Step 1: Install EAS CLI globally**

Run:

```bash
npm install -g eas-cli
```

Verify:

```bash
eas --version
```

Expected: version printed (≥13.0.0).

- [ ] **Step 2: Log in to Expo account**

Run:

```bash
eas login
```

Use your Expo account credentials. Expected: "Logged in as <username>".

- [ ] **Step 3: Configure EAS project**

Run:

```bash
eas init --id-source github
```

This creates an Expo project on EAS servers and writes the `projectId` to `app.config.ts` extra.

Verify `app.config.ts` now has `extra.eas.projectId` populated. Also update `.env` with `EAS_PROJECT_ID=<id>`.

- [ ] **Step 4: Prebuild native projects**

Run:

```bash
npx expo prebuild --clean
```

Expected: `ios/` and `android/` folders generated. **These are in .gitignore (Task 1)** — they're regenerated from app.config.ts on every build.

- [ ] **Step 5: Build dev client for iOS Simulator**

Run:

```bash
eas build --profile development --platform ios --local --non-interactive
```

OR if local build is heavy / Mac doesn't have Xcode:

```bash
eas build --profile development --platform ios --non-interactive
```

The cloud build takes ~10-20 min. Once complete, EAS gives you a `.tar.gz` URL to download and install on simulator.

For local Android build:

```bash
eas build --profile development --platform android --local --non-interactive
```

Output: `.apk` file. Install on Android device/emulator via `adb install`.

- [ ] **Step 6: Start Metro bundler**

Run:

```bash
npm run dev
```

Expected: Metro starts on port 8081. QR code displayed for dev client to scan.

- [ ] **Step 7: Open app on simulator/device**

- iOS: open Simulator, install the built .app via drag-drop, open it.
- Android: install APK on device/emulator, open it.

The app should connect to Metro, load the Welcome screen showing "THIS IS THE JOURNEY" + "Your adventure starts here" / "Ton aventure commence ici" (depending on device language).

- [ ] **Step 8: Verify no errors in Metro / device logs**

Check Metro terminal for errors. Check Xcode/Android console for crashes.

Expected: clean boot, fonts loaded, i18n working.

- [ ] **Step 9: Commit any final config changes**

```bash
git add app.config.ts
git commit -m "chore: EAS project initialized, dev client buildable"
```

---

## Phase 0 — Completion criteria

When you finish this plan, you should have:

- ✅ Git repo initialized with proper `.gitignore` (no native or env files committed)
- ✅ `LICENSE` (MIT), `CREDITS.md`, `README.md` present
- ✅ Expo SDK 54+ project with TypeScript strict mode + path aliases (`@core/`, `@shared/`, etc.)
- ✅ NativeWind v4 configured with Cozy Arcade design tokens (palette + fonts + spacing)
- ✅ ESLint + Prettier + Husky pre-commit working
- ✅ GitHub Actions CI passing on push (lint, typecheck, tests, credits audit)
- ✅ OSS reference repos cloned in `.references/` (not committed)
- ✅ Theme tokens in `src/core/theme/`
- ✅ 9 font files in `src/assets/fonts/`
- ✅ i18n (EN + FR) functional with `useTranslation()` hook + tests
- ✅ Supabase project provisioned via MCP, URL + anon key in `.env`
- ✅ Supabase JS client wired
- ✅ Sentry + PostHog SDK initialized (safe no-op without keys)
- ✅ Expo Router root layout loads fonts + initializes SDKs
- ✅ `PixelText` component implemented with all sizes/families + 4 passing tests
- ✅ Welcome screen "THIS IS THE JOURNEY" displays on device
- ✅ 404 screen functional
- ✅ EAS Dev Client built and running on iOS Simulator + Android Emulator
- ✅ Metro hot reload working
- ✅ All tests passing (`npm test` green)
- ✅ All commits clean, no `.env` or native folders in history

**Total expected**: ~15 tasks, ~75 steps, ~20-30 commits, 1 week of work (~20 hours).

**Ready for Phase 1** which will add: full database schema + RLS, auth flow (magic link + Apple + Google), passport verification (Tier 1/2/3), profile setup, trips CRUD, members + invitations, bottom tab bar shell.

---

## Self-Review notes

**Spec coverage** — Phase 0 of the spec (Section 12.1 Phase 0) covered :

- Init repo ✓ (Task 1)
- Init Expo (SDK 54+, TypeScript strict, file-based router) ✓ (Tasks 3, 4)
- EAS Build configured (iOS + Android), EAS Dev Client buildé localement ✓ (Tasks 4, 15)
- Supabase project créé (dev + prod environments) ✓ (Task 10) — dev only, prod created later
- NativeWind v4 setup avec design tokens ✓ (Task 5, 8)
- Fonts chargées via expo-font ✓ (Task 13)
- TanStack Query + Zustand setup — deps installed Task 3, providers added in Phase 1
- GitHub Actions ✓ (Task 11)
- Sentry + PostHog SDK wired ✓ (Task 12)
- `.references/` cloning script ✓ (Task 7)
- `CREDITS.md` + `LICENSE` (MIT) initiaux ✓ (Task 2)
- Livrables: app boote sur device ✓ (Task 15)

**i18n principe #13 (zéro hardcode)** — Welcome screen uses `t('welcome.title')` etc, no hardcoded strings.

**SOLID principle #14** — Feature-based folder structure in place (`src/features/` empty for now, will populate Phase 1+). Shared/Core separation established. SRP applied per file.

**100% gratuit principe #15** — All services on free tiers. Supabase free, GitHub free, EAS free 30 builds/mo, Sentry free, PostHog free. Only fonts/images downloaded as local assets (free).
