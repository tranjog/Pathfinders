# Screenshots

Drop the following files in this directory. The main `README.md` references them by these exact filenames.

## Status

| Filename | Status | What to capture |
|---|---|---|
| `hero.jpg` | ✅ present | Full app in Browse mode — map with cycleway/footway overlay (left), selected path, Street View panel (right). Recognisable city. |
| `browse-mode.jpg` | ✅ present | Zoomed-in Browse view showing the OSM cycleway overlay clearly — covered vs uncovered segments visible, sidebar with segment count. |
| `street-view-ride.jpg` | ✅ present | Mid-playback: cyclist marker on the map (left), matching Street View panel (right), playback controls visible (skip-back / play / skip-forward, progress bar, frame counter, speed selector). |
| `route-mode.jpg` | ✅ present | Route Planner expanded with ≥2 stops; map showing the resolved route polyline with A/B markers. Route alternatives visible if possible. |
| `api-key-dialog.jpg` | ✅ present | The BYOK dialog on a fresh launch — title, input, save button. |
| `saved-routes.jpg` | ⏳ needed | Saved Routes panel expanded with 2–4 saved routes listed (name + activity icon + stop count). Bonus: rename/delete affordances visible. |
| `activity-toggle.jpg` | ⏳ needed | Either a side-by-side composite (cycling vs running themed) of the same area, or a focused shot of the activity toggle in the header. Side-by-side is more impactful. |
| `location-search.jpg` | ✅ present | Header location-search input with the Google Places autocomplete dropdown open (3–5 suggestions). "Use my location" icon visible next to it. |

## Tips

- Use a 16:9 or 16:10 window so screenshots fit nicely on GitHub.
- For the desktop app, use `npm run tauri:dev` so the chrome looks native.
- Crop tightly to remove OS chrome unless the OS context matters.
- Export as JPG (matches existing files; smaller than PNG for photographic content).
- Keep file sizes reasonable (<1.5 MB each ideally) — run through an optimiser like [TinyPNG](https://tinypng.com/) (which also handles JPG) if needed.
