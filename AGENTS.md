# Agent guide

Pathfinders — Tauri 2 + React 19 + TypeScript + Zustand + Vite. Desktop and web builds. BYOK Google Maps key.

For the layer map, store boundaries, and data flow read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before any non-trivial change.

## Conventions (enforced)

- **Folder per component**: `components/X/{X.tsx, X.module.css, index.ts}`. The `index.ts` re-exports the default. Import via `@components/X`, never relative.
- **`services/` may have side effects** (Google Maps, DOM, network, storage). **`utils/` is strictly pure** — no DOM, no Google Maps, no I/O.
- **`constants/` has no barrel.** One file per enum with its derived type colocated. Import the specific concern (`@constants/activity`, `@constants/tuning`, …).
- **One Zustand store per concern.** Cross-store coordination lives in `<AppContent>`, not inside stores.
- **Path aliases**: `@components`, `@hooks`, `@store`, `@services`, `@utils`, `@constants/*`, `@types`, `@assets`. Use them.
- **CSS Modules per component.** Global CSS only in `src/styles/global.css`.
- **Don't widen Google Maps types to `any`.** Use a narrow typed cast where `@types/google.maps` is incomplete (e.g. `PlaceAutocompleteElement`).

## Verify after changes

```
npx tsc -p tsconfig.app.json --noEmit
npx oxlint
npx vite build
```

## Commits

- Conventional Commits (`feat(scope): …`, `refactor(arch): …`, `fix(browse): …`).
- Update [README.md](README.md) when changes affect the feature list, architecture, dependencies, or add new top-level `src/` directories.
- Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) when layer responsibilities, store boundaries, or component roles change.

## Run

- `npm run dev` — web (port 5173)
- `npm run tauri:dev` — desktop (requires Rust toolchain)
- `npm run tauri:build` — production bundle
