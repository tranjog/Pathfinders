# Pathfinders

> Scout cycling and running routes from your desk — before you head out the door.

Pathfinders overlays OpenStreetMap's cycleway and footway network on top of Google Maps, tells you which segments have Street View coverage, and lets you "ride" or "run" any path frame-by-frame in Street View. Plan multi-stop trips, save them, and replay them later.

Built with **Tauri + React + TypeScript**. Runs as a native desktop app on macOS, Windows, and Linux, or as a web app for development.

![Pathfinders hero shot](docs/screenshots/hero.png)

> 📸 _**Screenshot needed:** the full app window showing Browse mode in action — the map on the left with the colored OSM overlay (covered vs uncovered segments visible), a cyclist marker placed on the map, and the Street View panel rendered on the right. Pick a recognisable city (e.g. Barcelona, Amsterdam, NYC) and zoom to a level where individual cycle paths are clearly distinguishable. This is the first thing visitors see — make it count._

---

## Why Pathfinders?

- **You want to know where the cycle paths actually are** — not just where Google says you can ride. OSM has the granular cycleway/footway data; Pathfinders surfaces it.
- **You want to see the route before you ride it** — every segment is one click away from Street View, and you can play any path back as a virtual ride.
- **You plan trips in stages** — multi-stop routing with saveable, reloadable trips, switchable between cycling and running.

## Features at a glance

| | |
|---|---|
| 🗺️ **Browse mode** | OSM cycleway/footway segments overlaid on the map, color-coded by Street View availability |
| 🚴 **Street View ride** | Animated playback of any segment or full route, sampled at fixed intervals with auto-computed heading |
| 📍 **Route mode** | Multi-stop Google Maps cycling/walking directions (up to 10 stops) with route alternatives |
| 💾 **Saved routes** | Name and revisit any planned trip; rename / delete / one-click reload |
| 🖱️ **Map-click picking** | Click anywhere to set a stop; reverse-geocoded address fills the input automatically |
| 🔍 **Location search** | Google Places autocomplete in the header — jump to any city, address, or POI |
| 📡 **Use my location** | Native OS GPS prompt in the desktop app, browser geolocation in the web build |
| 🚴↔🏃 **Activity switcher** | Cycling vs running, with themed colors and activity-specific OSM queries |
| 🔑 **BYOK** | Bring your own Google Maps key — bake it into the build or paste it at runtime |
| 📜 **Attribution baked in** | OpenStreetMap credit always rendered on the map (ODbL compliance) |

---

## Showcase

### 🗺️ Browse mode — see the cycle network at a glance

![Browse mode with OSM overlay](docs/screenshots/browse-mode.png)

> 📸 _**Screenshot needed:** zoomed-in view of Browse mode showing the OSM cycleway overlay clearly — covered segments in the activity color, uncovered (no Street View) in a different shade. Sidebar should show the segment count and any loading/coverage progress. Pick a dense urban area (Barcelona, Copenhagen, Portland) so the network is visible._

Pan anywhere in the world. Pathfinders queries the OpenStreetMap Overpass API for all cycleways or footways in view, then checks which ones have Street View coverage. Color-coded segments show you instantly where you can — and can't — preview the route.

### 🚴 Street View ride — virtual scout before you ride

![Street View ride playback](docs/screenshots/street-view-ride.png)

> 📸 _**Screenshot needed:** mid-playback shot showing the cyclist marker on a road in the map (left), the matching Street View panel rendered (right), and the playback controls visible (skip-back / play / skip-forward, progress bar, frame counter "7 / 18", speed selector "1x"). Choose a segment with nice scenery so the Street View image looks good._

Click any segment in Browse mode and Pathfinders drops you into Street View at that point. Hit **▶** and the app samples points along the path at fixed intervals, snaps Street View to each one, and computes heading from the path geometry — you watch the route pass by like a low-frame-rate ride.

### 📍 Route mode — multi-stop planning

![Route mode planner](docs/screenshots/route-mode.png)

> 📸 _**Screenshot needed:** the side panel showing the Route Planner expanded with at least 3 stops (A, B, C) filled in via autocomplete or "Use my location", and the map showing the resolved route polyline with A/B/C markers. Bonus if route alternatives are visible. Capture before clicking Save so the planner UI is clearly visible._

Switch to Route mode, drop in up to 10 stops (type, click on map, or "use my location"), and Pathfinders calls the Google Directions API with cycling or walking mode depending on activity. When you have just two stops, you get route alternatives to compare. The whole route is then playable in Street View.

### 💾 Saved routes — your scouted trips, one click away

![Saved routes panel](docs/screenshots/saved-routes.png)

> 📸 _**Screenshot needed:** the Saved Routes panel expanded with 2–4 saved routes visible in the list (each showing the name, activity icon, and stop count). Bonus: include the rename/delete affordances if visible. Capture from the route planner side panel._

Save any route by name. Reloading replays the original stops through the Directions API so the route stays current with up-to-date roads. Stored locally per-install — nothing leaves your machine.

### 🚴↔🏃 Activity switcher — one app, two themes

![Activity switcher](docs/screenshots/activity-toggle.png)

> 📸 _**Screenshot needed:** either a side-by-side composite (cycling on the left, running on the right) showing the same area with different themed colors and overlay densities, OR a single shot focused on the cycling/running toggle in the header with the dropdown / pills visible. The side-by-side is more impactful._

Toggle between cycling and running. Each activity loads its own Overpass query (cycleways vs footways), passes the appropriate travel mode to Google Directions, and switches the entire app's theme color.

### 🔍 Location search — jump anywhere

![Location search](docs/screenshots/location-search.png)

> 📸 _**Screenshot needed:** the header location-search input with the Google Places autocomplete dropdown open showing 3–5 suggestions for a partial query (e.g. "san fra"). Make sure the "Use my location" icon is also visible next to the input._

Google Places autocomplete in the header — type any city, address, or POI and the map flies there. The "Use my location" icon next to it triggers a native GPS prompt (Tauri plugin on desktop, browser geolocation on web).

---

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

> ⚠️ **Bring your own Google Maps API key.** Pathfinders does not ship with a key — every install must supply one. All API usage is billed to *your* Google Cloud account, so **set quota caps and key restrictions before publishing builds**.

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

![BYOK dialog](docs/screenshots/api-key-dialog.png)

> 📸 _**Screenshot needed:** the API-key dialog from a fresh launch (no key configured) — title, input field, save button, and any helper/link text visible. Optional: a second variant showing the dialog reopened with an error message after a rejected key, side-by-side or in a separate image._

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

For a tour of the codebase — layer responsibilities, store boundaries, and the data-flow diagrams for Browse mode, Route mode, and BYOK — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Attribution

Cycleway and footway data from [OpenStreetMap](https://www.openstreetmap.org/), © OpenStreetMap contributors, licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/). The OSM credit is rendered on the map at all times.

Map tiles, Street View imagery, autocomplete, and routing from Google Maps Platform.

## License

Apache License 2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
