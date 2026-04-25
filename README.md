# Pathfinders

Desktop app for exploring cycling and running routes on Google Maps with Street View previews and OpenStreetMap cycleway data. Built with Tauri + React + TypeScript.

## Features

- Browse OSM cycleway / footway segments around the visible map area
- Automatic Street View coverage check per segment
- Cycling/walking directions with multiple route alternatives
- Animated Street View "ride" along any segment or route
- Activity toggle: cycling vs running theming
- Geolocation-aware routing

## Setup

### Prerequisites

- Node.js 20+
- Rust toolchain (`rustup`) for the Tauri shell
- A Google Cloud project with these APIs enabled:
  - Maps JavaScript API
  - Places API
  - Street View Static API
  - Directions API

Get a key: https://developers.google.com/maps/documentation/javascript/get-api-key

Restrict the key (HTTP referrers for web, application restrictions for the bundled app) and cap quota before publishing builds.

### Installing dependencies

```bash
npm install
```

### Providing the Google Maps API key

Two options:

**Option 1 — bake it into the build.** Copy `.env.example` to `.env` and fill in your key:

```bash
cp .env.example .env
# edit .env
```

The build will use this key directly and the in-app key dialog will not appear.

**Option 2 — paste it at runtime.** Skip the `.env` file. On first launch the app shows a dialog asking for your key. The key is stored in the app's local storage (per-user, per-install) and can be changed or cleared from the gear icon in the header.

## Development

```bash
npm run dev          # web dev server only
npm run tauri:dev    # full desktop shell
```

## Build

```bash
npm run build        # web bundle
npm run tauri:build  # desktop installers in src-tauri/target/release/bundle
```

## License

Apache License 2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
