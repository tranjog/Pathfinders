import type { PathSegment, LatLng, ActivityConfig } from '@types';
import styles from './BrowseSidebar.module.css';

interface BrowseSidebarProps {
  loading: boolean;
  error: string | null;
  tooZoomedOut: boolean;
  segmentCount: number;
  selectedSegment?: PathSegment | null;
  checking?: boolean;
  coverageProgress?: number;
  onStartMovement?: (points: LatLng[]) => void;
  config: ActivityConfig;
}

export default function BrowseSidebar({
  loading,
  error,
  tooZoomedOut,
  segmentCount,
  selectedSegment,
  checking,
  coverageProgress = 0,
  onStartMovement,
  config,
}: BrowseSidebarProps) {
  if (tooZoomedOut) {
    return (
      <div className="panel-message">
        {config.zoomMessage}
      </div>
    );
  }

  if (loading) {
    return <div className="loading-spinner">{config.loadingMessage}</div>;
  }

  if (error) {
    return (
      <div className="panel-message" style={{ color: 'var(--red)' }}>
        {error}
      </div>
    );
  }

  if (segmentCount === 0) {
    return (
      <div className="panel-message">
        {config.emptyMessage}
      </div>
    );
  }

  return (
    <div className="panel-section">
      <h3>{config.pathNounPlural}</h3>
      <div className={styles.coverageStats}>
        <span className={styles.stat}>
          <span className={`${styles.dot} ${styles.gray}`} /> {segmentCount} paths found
        </span>
      </div>

      {selectedSegment ? (
        <div className={styles.segmentInfo}>
          <h4>{selectedSegment.name || `Path #${selectedSegment.id}`}</h4>
          {checking ? (
            <div className="loading-spinner">
              Checking coverage... {Math.round(coverageProgress * 100)}%
            </div>
          ) : selectedSegment.coverageChecked ? (
            <>
              <div className={styles.coverageStats} style={{ marginTop: 8 }}>
                <span className={styles.stat}>
                  <span className={`${styles.dot} ${styles.green}`} />
                  {Math.round((selectedSegment.coverageRatio ?? 0) * 100)}% coverage
                </span>
              </div>
              {(selectedSegment.coverageRatio ?? 0) > 0 && onStartMovement && (
                <button
                  className={styles.btnStart}
                  onClick={() => onStartMovement(selectedSegment.points)}
                >
                  {config.actionVerb} this path
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          Click a path to check Street View coverage.
        </p>
      )}
    </div>
  );
}
