# Architecture

This document describes the high-level structure of the Pathfinders codebase, the responsibilities of each layer, and how data flows through the app.

For the user-facing feature overview, see the main [README](../README.md).

## Stack

- **Frontend** — React 19 + TypeScript, built with Vite
- **State** — Zustand (one store per concern; no global reducer)
- **Maps** — `@vis.gl/react-google-maps` wrapping the Google Maps JS API
- **Linting** — oxlint
- **Desktop shell** — Tauri 2 (Rust)
- **OSM data** — Overpass API (no key required)

## Top-level layout

```
src/
├── App.tsx                # top-level layout, key resolution, mode switching
├── main.tsx               # React entry point
├── components/            # UI (presentational + container components)
├── hooks/                 # data fetching + session orchestration
├── store/                 # Zustand stores (one per concern)
├── services/              # pure helpers (no React, no DOM)
├── utils/                 # framework-agnostic utilities
├── constants/             # per-activity config + shared constants
├── types/                 # shared TypeScript types
├── assets/icons/          # SVG icon components
└── styles/                # global CSS

src-tauri/                 # Rust desktop shell, plugin registrations,
                           # capabilities, macOS Info.plist
```

## Layer responsibilities

### `App.tsx`

Top-level orchestration:

- Resolves the Google Maps API key (env vs user-supplied) and gates the app on a valid key
- Switches between **Browse** and **Route** modes
- Owns transient UI state (which side panels are open, the resize handle, the search target)
- Wires high-level handlers (`handleActivityChange`, `handleClearRoute`, `handleLoadSavedRoute`) that coordinate multiple stores at once

### `components/`

UI building blocks. Each one is scoped to a single concern and styled via CSS Modules.

| File | Role |
|---|---|
| `MapView.tsx` | Google Map host, search-target panning, route-mode marker rendering |
| `CoverageOverlay.tsx` | Renders OSM segments as polylines in the active activity's theme accent, with a halo highlight on the selected segment |
| `RouteOverlay.tsx` | Renders the active route polyline in Route mode |
| `PlaybackMarker.tsx` | The cyclist/runner marker that follows playback or Street View position |
| `StreetViewPanel.tsx` | Embedded Google Street View pane synced to a `LatLng` + heading |
| `BrowseSidebar.tsx` | Browse-mode sidebar (segment count, coverage progress, start-movement) |
| `RoutePlanner.tsx` | Multi-stop planner with Places autocomplete, map-pick mode, "use my location" |
| `SavedRoutes.tsx` / `SaveRouteAction.tsx` | Persisted-route list + save button |
| `MovementControls.tsx` | Skip / play / pause / speed for Street View playback |
| `LocationSearch.tsx` | Header search box (Places autocomplete) + "use my location" button |
| `ActivityToggle.tsx` / `ModeToggle.tsx` | Cycling↔running and Browse↔Route switches |
| `ApiKeyDialog.tsx` | First-launch BYOK dialog and settings re-entry |

### `hooks/`

React hooks that combine services + stores into reusable behaviours.

| File | Role |
|---|---|
| `useApiKey.ts` | Resolves env vs user-supplied API key; handles auth-failure resets |
| `useOverpassPaths.ts` | Fetches OSM cycleways/footways for the current map bounds (debounced) |
| `useStreetViewCoverage.ts` | For each segment, queries Street View metadata and caches coverage |
| `useMapSession.ts` | Browse-mode orchestration: merges raw paths with the cached coverage results in `mapSessionStore`, exposes the segment-click handler that toggles selection / triggers coverage checks |

### `store/`

Zustand stores. Each store owns one slice of global state.

| Store | State |
|---|---|
| `activityStore` | Current activity (cycling / running) |
| `routePlannerStore` | List of stops, map-pick mode, max stops |
| `directionsStore` | Fetched route alternatives, selected index, loading/error |
| `savedRoutesStore` | Persisted saved routes (name, stops, activity) |
| `streetViewPlaybackStore` | Playback points, current index, heading, playing/paused, speed |
| `mapSessionStore` | Browse-mode session: selected segment, Street View target (position + heading), per-segment coverage cache |
| `userLocationStore` | Cached GPS location, request-location action |

Stores are deliberately small and single-purpose. Cross-store coordination happens at the `App.tsx` level (e.g. `handleClearRoute` resets directions + map session + playback in one click).

### `services/`

Pure functions — no React, no DOM. Easy to unit-test and swap.

| File | Role |
|---|---|
| `apiKey.ts` | Read/write the user-supplied key in localStorage |
| `directions.ts` | Wraps `google.maps.DirectionsService` |
| `geocoder.ts` | Reverse-geocode a `LatLng` to a human-readable address |
| `geometry.ts` | Point sampling along a path, distance computations |
| `location.ts` | Tauri vs browser geolocation abstraction |
| `overpass.ts` | Overpass API HTTP calls |
| `savedRoutes.ts` | localStorage persistence for saved routes |
| `streetview.ts` | Street View metadata lookup + coverage probing |

### `utils/`

Framework-agnostic helpers that don't fit "service" semantics.

| File | Role |
|---|---|
| `mapBounds.ts` | Compute and compare map bounds |
| `maps.ts` | Google Maps element factories (e.g. `PlaceAutocompleteElement`) |
| `overpassQuery.ts` | Build Overpass QL queries for the active activity + bounds |
| `platform.ts` | `isTauri`, `isMac` detection |

### `constants/`

| File | Role |
|---|---|
| `activityConfig.ts` | Per-activity Overpass query, Google travel mode, theme color |
| `index.ts` | Shared scalar constants (Street View sampling interval, etc.) |

### `src-tauri/`

The Rust desktop shell:

- Tauri 2 app entry point and configuration
- Plugin registrations (`tauri-plugin-geolocation`)
- Platform capabilities and permissions (allow-list of frontend → Rust calls)
- macOS `Info.plist` with location-usage strings

## Data flow

### Browse mode

```
map bounds change
  └→ useOverpassPaths   (debounced)
       └→ services/overpass  → cycleways/footways for activity
            └→ <CoverageOverlay>  (theme-accented polylines, selection halo)

user clicks a segment
  └→ useMapSession.handleSegmentClick
       └→ mapSessionStore  (selectedSegment, streetViewPosition, heading)
       └→ useStreetViewCoverage  (probes Street View, caches the result)
            └→ mapSessionStore.upsertCheckedSegment
       └→ <BrowseSidebar> + <StreetViewPanel>  read directly from the store

user hits "Start movement"
  └→ services/geometry  (sample N points along the path)
       └→ streetViewPlaybackStore.reset(points, true)
            └→ <PlaybackMarker> follows currentIndex
            └→ <StreetViewPanel> snaps to currentIndex
            └→ <MovementControls>
```

### Route mode

```
user fills stops in <RoutePlanner>
  └→ routePlannerStore

user clicks "Find Routes"
  └→ services/directions
       └→ directionsStore.getRoute(stops, travelMode)
            └→ <RouteOverlay>  (selected route polyline)

user clicks "Start movement" on a route
  └→ same playback path as Browse mode

user clicks Save
  └→ savedRoutesStore  → localStorage

user reloads a saved route
  └→ App.handleLoadSavedRoute
       └→ resets activity if needed
       └→ restores stops
       └→ replays Directions API call so the route stays current
```

### BYOK key resolution

```
build time
  └→ .env (VITE_GOOGLE_MAPS_API_KEY)

runtime
  └→ useApiKey checks env first
       └→ if absent: read from localStorage
            └→ if absent: render <ApiKeyDialog>
       └→ on auth failure: clear stored user key, reopen dialog with error
```

## Guiding principles

- **Stores stay small.** One concern per store. Cross-cutting actions (Clear, switch activity, load saved route) live in `App.tsx` where they can reset multiple stores atomically.
- **Services are pure.** No React, no DOM, no globals. Easy to read, easy to test, easy to mock.
- **Hooks combine; components render.** A component that's doing more than render + dispatch should probably extract a hook.
- **CSS Modules per component.** No global styles except `styles/global.css` (resets, CSS variables, modal/button base classes).
- **Accept the Google Maps types as-is.** Where `@types/google.maps` is incomplete (e.g. `PlaceAutocompleteElement` missing from `PlacesLibrary`), use a narrow typed cast — don't widen to `any`.
