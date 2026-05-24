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

### Architecture

Feature-based modular structure following SOLID principles. See `docs/superpowers/specs/...` Section 4.3.

## License

MIT — see [LICENSE](LICENSE).
Open-source credits in [CREDITS.md](CREDITS.md).
