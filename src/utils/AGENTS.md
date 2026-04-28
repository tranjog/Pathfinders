# utils/

Strictly pure data transforms. No DOM, no Google Maps, no I/O.

The only allowed exception is reading `navigator`/`window` once at module load for environment detection (`isMac`, `isTauri`).

If you need to touch anything outside the inputs, use `services/`.
