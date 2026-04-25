const STORAGE_KEY = 'pathfinders.gmaps_api_key';

export type KeySource = 'env' | 'user' | null;

const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

export function getEnvKey(): string | null {
  if (!envKey || envKey === 'your_api_key_here') return null;
  return envKey;
}

export function getStoredKey(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearStoredKey(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function resolveApiKey(): { key: string | null; source: KeySource } {
  const env = getEnvKey();
  if (env) return { key: env, source: 'env' };
  const stored = getStoredKey();
  if (stored) return { key: stored, source: 'user' };
  return { key: null, source: null };
}

export function isPlausibleKey(key: string): boolean {
  const k = key.trim();
  return k.length >= 30 && /^[A-Za-z0-9_-]+$/.test(k);
}
