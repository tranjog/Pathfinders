# Pathfinders

Pathfinders is a desktop app for scouting cycling and running routes before you head out. Pan the map to anywhere in the world and the app pulls the local cycleway and footway network from OpenStreetMap, overlays it on Google Maps, and tells you which segments have Street View coverage. Click any segment to drop into Street View at that point, then play it back as a virtual "ride" or "run" sampled along the path.

When you want to plan a specific trip, switch to Route mode: enter a start and end (or use your current location), pick from cycling/walking route alternatives, and preview the whole route in Street View frame by frame. Toggle between cycling and running themes; each loads its own OSM query and the appropriate Google travel mode.

Built with Tauri + React + TypeScript. Runs as a native desktop app on macOS, Windows, and Linux, or as a plain web app for development.

> **Bring your own Google Maps API key.** Pathfinders does not ship with a key — every install must supply one. You can either bake it into the build via a `.env` file or paste it into the in-app dialog on first launch. See [Providing the Google Maps API key](#providing-the-google-maps-api-key) below. All API usage is billed to *your* Google Cloud account, so set quota caps and key restrictions before publishing builds.

## Features

- **Browse mode** — overlay OSM cycleway / footway segments on the visible map, color-coded by Street View availability
- **Route mode** — Google Maps cycling/walking directions with multiple route alternatives
- **Street View ride** — animated playback of any segment or full route, sampled at fixed intervals with auto-computed heading
- **Location search** — Google Places autocomplete in the header; jump to any city, address, or POI
- **Use my location** — center the map on your current GPS position; native OS prompt via `tauri-plugin-geolocation` in the desktop app, browser geolocation in the web build
- **Activity switcher** — cycling vs running, with themed colors and activity-specific OSM queries
- **BYOK (bring your own key)** — supply a Google Maps key at build time (`.env`) or paste it into the in-app dialog on first launch; key stored locally, never bundled in the public source
- **Map data attribution** — built-in OpenStreetMap credit on the map (ODbL compliance)

## Setup

### Prerequisites

- Node.js 20+
- Rust toolchain (`rustup`) — only required for the Tauri desktop shell
- A Google Cloud project with these APIs enabled:
  - Maps JavaScript API
  - Places API (Autocomplete)
  - Street View Static API
  - Directions API

Get a key: https://developers.google.com/maps/documentation/javascript/get-api-key

Restrict the key (HTTP referrers for web, application restrictions for the bundled app) and set a daily quota cap before publishing builds — Maps Platform charges per request.

### Install

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

If Google rejects the key (wrong restrictions, missing APIs), the app catches the auth failure, clears the stored user-supplied key, and reopens the dialog with an error.

## Running

### Web (development only)

```bash
npm run dev
```

Opens at http://localhost:5173. The browser handles the geolocation prompt natively.

### Desktop (Tauri)

```bash
npm run tauri:dev    # dev with HMR + devtools
npm run tauri:build  # production bundle in src-tauri/target/release/bundle
```

On macOS, the first time you trigger location it'll show the system permission prompt. If you deny it once, re-enable via *System Settings → Privacy & Security → Location Services → Pathfinders*.

## Architecture

- `src/App.tsx` — top-level layout, key resolution, browse vs route mode switching
- `src/components/` — UI (map, search, sidebars, dialogs, movement controls)
- `src/hooks/` — data fetching (OSM Overpass, Street View coverage, directions, geolocation, map session)
- `src/services/` — pure helpers (Overpass queries, geometry, Street View, directions, API key storage)
- `src/utils/` — map bounds, segment coloring, Overpass query builder, platform detection
- `src/constants/activityConfig.ts` — per-activity OSM Overpass query + travel mode + theme
- `src/constants/index.ts` — shared constants
- `src/types/index.ts` — shared TypeScript types
- `src/assets/icons/` — SVG icon components
- `src-tauri/` — Rust shell, plugin registrations, capabilities, macOS Info.plist

## Attribution

Cycleway and footway data from [OpenStreetMap](https://www.openstreetmap.org/), © OpenStreetMap contributors, licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/). The OSM credit is rendered on the map at all times.

Map tiles, Street View imagery, autocomplete, and routing from Google Maps Platform.

## License

Apache License 2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
