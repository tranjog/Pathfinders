import { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import AppContent from '@components/AppContent';
import ApiKeyDialog from '@components/ApiKeyDialog';
import { useApiKey } from '@hooks/useApiKey';
import { markEnvKeyDenied } from '@services/apiKey';

declare global {
  interface Window { gm_authFailure?: () => void }
}

export default function App() {
  const { key, source, saveKey, clearKey, refresh } = useApiKey();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    window.gm_authFailure = () => {
      setAuthError('Google rejected the key. Check restrictions and that required APIs are enabled.');
      // If the bad key came from .env, ignore it for the rest of the session so
      // the user can paste a working one. Always wipe any stored key so the
      // dialog reopens cleanly.
      if (source === 'env') markEnvKeyDenied();
      clearKey();
      refresh();
      setSettingsOpen(true);
    };
    return () => { delete window.gm_authFailure; };
  }, [source, clearKey, refresh]);

  const handleSave = (newKey: string) => {
    setAuthError(null);
    saveKey(newKey);
    setSettingsOpen(false);
  };

  const handleClear = () => {
    clearKey();
    setSettingsOpen(false);
  };

  if (!key) {
    return (
      <ApiKeyDialog
        errorMessage={authError ?? undefined}
        onSave={handleSave}
      />
    );
  }

  return (
    <APIProvider key={key} apiKey={key} libraries={['places']}>
      <AppContent
        keySource={source}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen && (
        <ApiKeyDialog
          initialKey={source === 'user' ? key : ''}
          showClear={source === 'user'}
          errorMessage={authError ?? undefined}
          onSave={handleSave}
          onClear={handleClear}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </APIProvider>
  );
}
