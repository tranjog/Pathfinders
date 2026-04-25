import { useEffect, useState } from 'react';
import { isPlausibleKey } from '../services/apiKey';

type Props = {
  initialKey?: string;
  showClear?: boolean;
  errorMessage?: string;
  onSave: (key: string) => void;
  onClear?: () => void;
  onClose?: () => void;
};

export default function ApiKeyDialog({ initialKey = '', showClear, errorMessage, onSave, onClear, onClose }: Props) {
  const [value, setValue] = useState(initialKey);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = value.trim();
  const valid = isPlausibleKey(trimmed);
  const showValidationError = touched && !valid && trimmed.length > 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSave(trimmed);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Google Maps API Key</h2>
        <p className="modal-body">
          Pathfinders use Google Maps APIs (Maps JavaScript, Places, Street View, Directions).
          Paste your key below to enable map features. The key save in local app storage only.
        </p>
        <p className="modal-body">
          Get a key:{' '}
          <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noreferrer">
            Google Cloud Console
          </a>
          . Enable: Maps JavaScript, Places, Street View Static, Directions.
        </p>
        <input
          type="text"
          className="modal-input"
          placeholder="AIza..."
          value={value}
          autoFocus
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        {(errorMessage || showValidationError) && (
          <div className="modal-error">
            {errorMessage ?? 'Key shape look invalid. Expect 30+ chars, alphanumerics/_/-.'}
          </div>
        )}
        <div className="modal-actions">
          {showClear && onClear && (
            <button className="btn-secondary" onClick={onClear}>Clear key</button>
          )}
          <div style={{ flex: 1 }} />
          {onClose && <button className="btn-secondary" onClick={onClose}>Cancel</button>}
          <button className="btn-primary" onClick={submit} disabled={!trimmed}>Save</button>
        </div>
      </div>
    </div>
  );
}
