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
├── App.tsx                # BYOK key gate; renders AppContent once a key is resolved
├── main.tsx               # React entry point
├── components/            # UI — one folder per component (X/X.tsx, X/X.module.css, X/index.ts)
├── hooks/                 # data fetching + UI orchestration
├── store/                 # Zustand stores (one per concern)
├── services/              # side-effecting helpers (Google Maps, DOM, network, storage)
├── utils/                 # pure data transforms — no DOM, no Google Maps, no I/O
├── constants/             # one file per enum (with its derived type) + tuning constants
├── types/                 # shared TypeScript types
├── assets/icons/          # SVG icon components
└── styles/                # global CSS

src-tauri/                 # Rust desktop shell, plugin registrations,
                           # capabilities, macOS Info.plist
```

### Component folders

Each component lives in its own folder, e.g.:

```
components/RoutePlanner/
├── RoutePlanner.tsx
├── RoutePlanner.module.css
└── index.ts            # `export { default } from './RoutePlanner'`
```

The `index.ts` re-export means imports stay short (`@components/RoutePlanner`) and the folder gives the component a place to grow sibling files (sub-components, helpers) without polluting `components/`.

## Layer responsibilities

### `App.tsx`

Just the BYOK key gate:

- Resolves the Google Maps API key (env vs user-supplied)
- Renders `<ApiKeyDialog>` until a valid key is available
- Mounts `<APIProvider>` and `<AppContent>` once the key is set
- Handles `gm_authFailure` to recover from rejected keys

Everything else (mode switching, panel state, store coordination) lives in `<AppContent>`.

### `components/AppContent/`

The actual app shell once the key gate passes:

- Switches between **Browse** and **Route** modes
- Owns transient UI state (which side panels are open, the search target)
- Wires high-level handlers (`handleActivityChange`, `handleClearRoute`, `handleLoadSavedRoute`) that coordinate multiple stores at once
- Delegates the resize handle to `useResizableLayout` and viewport tracking to `useWindowWidth`

### `components/`

UI building blocks. Each one lives in its own folder and is styled via CSS Modules.

| Component | Role |
|---|---|
| `AppContent` | App shell once the BYOK gate passes — mode switching, panel state, store coordination |
| `MapView` | Google Map host, search-target panning, route-mode marker rendering |
| `CoverageOverlay` | Renders OSM segments as polylines in the active activity's theme accent, with a halo highlight on the selected segment |
| `RouteOverlay` | Renders the active route polyline in Route mode |
| `PlaybackMarker` | The cyclist/runner marker that follows playback or Street View position |
| `StreetViewPanel` | Embedded Google Street View pane synced to a `LatLng` + heading |
| `BrowseSidebar` | Browse-mode sidebar (segment count, coverage progress, start-movement) |
| `RoutePlanner` | Multi-stop planner with Places autocomplete, map-pick mode, "use my location" |
| `RouteAlternatives` | Renders the list of fetched route alternatives, "go" button, save/export actions |
| `SavedRoutes` / `SaveRouteAction` | Persisted-route list + save button |
| `ExportRouteAction` / `ExportRouteDialog` | Export-trigger button + format/options dialog (GPX today; KML/Strava/Garmin tiles for future) |
| `MovementControls` | Skip / play / pause / speed for Street View playback |
| `LocationSearch` | Header search box (Places autocomplete) + "use my location" button |
| `ActivityToggle` / `ModeToggle` | Cycling↔running and Browse↔Route switches |
| `ApiKeyDialog` | First-launch BYOK dialog and settings re-entry |

### `hooks/`

React hooks that combine services + stores into reusable behaviours.

| File | Role |
|---|---|
| `useApiKey.ts` | Resolves env vs user-supplied API key; handles auth-failure resets |
| `useOverpassPaths.ts` | Fetches OSM cycleways/footways for the current map bounds (debounced) |
| `useStreetViewCoverage.ts` | For each segment, queries Street View metadata and caches coverage |
| `useMapSession.ts` | Browse-mode orchestration: merges raw paths with the cached coverage results in `mapSessionStore`, exposes the segment-click handler that toggles selection / triggers coverage checks |
| `useWindowWidth.ts` | Tracks `window.innerWidth` and re-renders on resize |
| `useResizableLayout.ts` | Drag-to-resize between the map pane and the side panel (side-by-side or stacked) |

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

Side-effecting helpers — wrap an API, the DOM, or storage. Still no React, but they're allowed to talk to Google Maps, fetch, or `localStorage`. The intent is "anything that's not a pure data transform but doesn't belong in a hook or component."

| File | Role |
|---|---|
| `apiKey.ts` | Read/write the user-supplied key in localStorage |
| `directions.ts` | Wraps `google.maps.DirectionsService` |
| `geocoder.ts` | Reverse-geocode a `LatLng` to a human-readable address |
| `geometry.ts` | Point sampling along a path, distance computations (pure, but kept here for cohesion with the other geo services) |
| `gpxExport.ts` | GPX 1.1 builder + native/web save flow |
| `location.ts` | Tauri vs browser geolocation abstraction |
| `mapBounds.ts` | `boundsForPath` over Google's `LatLngBounds` |
| `overpass.ts` | Overpass API HTTP calls |
| `places.ts` | Google `PlaceAutocompleteElement` factory + DOM helpers for its closed shadow DOM |
| `savedRoutes.ts` | localStorage persistence (with runtime validation) for saved routes |
| `streetview.ts` | Street View metadata lookup + coverage probing |

### `utils/`

Strictly pure data transforms. No DOM, no Google Maps, no I/O. If a helper touches anything outside its inputs, it belongs in `services/`.

| File | Role |
|---|---|
| `overpassQuery.ts` | String templates for cycleway/footway Overpass QL queries |
| `platform.ts` | `isTauri`, `isMac` detection (reads `navigator`/`window` once at module load) |

### `constants/`

One file per enum (with its derived type colocated) and one tuning file. There is **no `index.ts` barrel** — imports name the specific concern they need.

| File | Role |
|---|---|
| `activity.ts` | `ACTIVITY` const + `ActivityType` |
| `appMode.ts` | `APP_MODE` const + `AppMode` |
| `travelMode.ts` | `TRAVEL_MODE` const + `TravelModeKey` |
| `activityConfig.ts` | Per-activity Overpass query, Google travel mode, theme color |
| `tuning.ts` | Scalar constants (Street View sampling interval, debounce ms, default map view, etc.) |

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
  └→ AppContent.handleLoadSavedRoute
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

- **Stores stay small.** One concern per store. Cross-cutting actions (Clear, switch activity, load saved route) live in `<AppContent>` where they can reset multiple stores atomically.
- **Services do the dirty work; utils stay pure.** `services/` may touch Google Maps, the DOM, network, or storage. `utils/` may not touch any of them — they are pure data transforms. This separation makes the test surface for each clear.
- **Hooks combine; components render.** A component that's doing more than render + dispatch should probably extract a hook.
- **One file per enum, with its derived type next to it.** No `@constants` barrel. Each callsite imports the specific concern it needs.
- **Folder per component.** `X/X.tsx`, `X/X.module.css`, `X/index.ts`. CSS Modules co-located. No global styles except `styles/global.css` (resets, CSS variables, modal/button base classes).
- **Accept the Google Maps types as-is.** Where `@types/google.maps` is incomplete (e.g. `PlaceAutocompleteElement` missing from `PlacesLibrary`), use a narrow typed cast — don't widen to `any`.
