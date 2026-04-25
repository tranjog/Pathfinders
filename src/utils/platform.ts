export const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
