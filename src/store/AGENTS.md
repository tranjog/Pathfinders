# store/

One Zustand store per concern. If a new concern appears, create a new store rather than widening an existing one.

Cross-store coordination (clear-everything actions, switch-activity resets, load-saved-route) lives in `<AppContent>` so multiple stores can be reset atomically. Don't reach into one store from another.
