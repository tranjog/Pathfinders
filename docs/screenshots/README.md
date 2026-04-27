# Screenshots

Drop the following PNG files in this directory. The main `README.md` references them by these exact filenames.

| Filename | What to capture |
|---|---|
| `hero.png` | Full app window in Browse mode — colored OSM overlay on the map (left), cyclist marker placed, Street View panel rendered (right). Pick a recognisable city. |
| `browse-mode.png` | Zoomed-in Browse view showing the OSM cycleway overlay clearly — covered vs uncovered segments visible, sidebar with segment count / coverage progress. |
| `street-view-ride.png` | Mid-playback: cyclist marker on the map (left), matching Street View panel (right), playback controls visible (skip-back / play / skip-forward, progress bar, frame counter, speed selector). |
| `route-mode.png` | Route Planner expanded with ≥3 stops (A, B, C) filled; map showing the resolved route polyline with A/B/C markers. Bonus: route alternatives. |
| `saved-routes.png` | Saved Routes panel expanded with 2–4 saved routes listed (name + activity icon + stop count). Bonus: rename/delete affordances visible. |
| `activity-toggle.png` | Either a side-by-side composite (cycling vs running themed) of the same area, or a focused shot of the activity toggle in the header. Side-by-side is more impactful. |
| `location-search.png` | Header location-search input with the Google Places autocomplete dropdown open (3–5 suggestions). "Use my location" icon visible next to it. |
| `api-key-dialog.png` | The BYOK dialog on a fresh launch — title, input, save button. Optional: a second variant showing the error state after a rejected key. |

## Tips

- Use a 16:9 or 16:10 window so screenshots fit nicely on GitHub.
- For the desktop app, use `npm run tauri:dev` so the chrome looks native.
- Crop tightly to remove OS chrome unless the OS context matters.
- Export as PNG (preserves UI sharpness over JPEG).
- Keep file sizes reasonable (<500 KB each ideally) — run through an optimiser like [TinyPNG](https://tinypng.com/) if needed.
