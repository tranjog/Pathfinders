import { useCallback, useState } from 'react';
import { clearStoredKey, resolveApiKey, setStoredKey, type KeySource } from '../services/apiKey';

export function useApiKey() {
  const [state, setState] = useState<{ key: string | null; source: KeySource }>(() => resolveApiKey());

  const saveKey = useCallback((key: string) => {
    setStoredKey(key);
    setState(resolveApiKey());
  }, []);

  const clearKey = useCallback(() => {
    clearStoredKey();
    setState(resolveApiKey());
  }, []);

  return { key: state.key, source: state.source, saveKey, clearKey };
}
