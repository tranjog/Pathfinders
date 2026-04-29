import { useEffect } from 'react';
import styles from './ImportErrorDialog.module.css';

interface Props {
  filename: string;
  message: string;
  onClose: () => void;
}

export default function ImportErrorDialog({ filename, message, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Couldn&apos;t import file</h2>
        <div className={styles.errorCard}>
          <strong>{filename}</strong>
          <div className={styles.errorMessage}>{message}</div>
          <div className={styles.errorHint}>
            Supported: <code>.gpx</code>, <code>.kml</code>, <code>.geojson</code>
          </div>
        </div>
        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button className="btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
