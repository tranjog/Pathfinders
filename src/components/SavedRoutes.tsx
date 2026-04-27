import { useState } from 'react';
import type { SavedRoute } from '@types';
import { ACTIVITY } from '@constants';
import { useSavedRoutesStore } from '@store/savedRoutesStore';
import { useActivityStore } from '@store/activityStore';
import { CyclistIcon, RunnerIcon } from '@assets';
import styles from './SavedRoutes.module.css';

interface SavedRoutesProps {
  open: boolean;
  onToggle: () => void;
  onLoad: (route: SavedRoute) => void;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function SavedRoutes({ open, onToggle, onLoad }: SavedRoutesProps) {
  const { routes, remove, rename } = useSavedRoutesStore();
  const { activity } = useActivityStore();
  const visibleRoutes = routes.filter((r) => r.activity === activity);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (route: SavedRoute) => {
    setRenamingId(route.id);
    setRenameValue(route.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      rename(renamingId, renameValue);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className="panel-section">
      <div className={styles.sectionHeader} onClick={onToggle}>
        <div className={styles.headerLeft}>
          <h3>Saved Routes</h3>
          <span className={styles.countBadge}>{visibleRoutes.length}</span>
        </div>
        <svg
          className={`${styles.chevron}${open ? ` ${styles.chevronOpen}` : ''}`}
          width="16" height="8" viewBox="0 0 18 10"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="1,1 9,9 17,1" />
        </svg>
      </div>
      <div className={`${styles.sectionBody}${open ? '' : ` ${styles.sectionBodyCollapsed}`}`}>
        <div>
          {visibleRoutes.length === 0 ? (
            <div className={styles.empty}>
              No saved routes yet.<br />
              Plan a route, then click <strong>Save</strong> to keep it here.
            </div>
          ) : (
            <div className={styles.savedList}>
              {visibleRoutes.map((route) => {
                const isRenaming = renamingId === route.id;
                const filledStops = route.stops.filter((s) => s.latLng !== null).length;
                return (
                  <div
                    key={route.id}
                    className={styles.savedRow}
                    onClick={() => { if (!isRenaming) onLoad(route); }}
                  >
                    <div className={styles.savedIcon} title={route.activity}>
                      {route.activity === ACTIVITY.CYCLING ? <CyclistIcon /> : <RunnerIcon />}
                    </div>
                    {isRenaming ? (
                      <div className={styles.renameRow} onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          className={styles.renameInput}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            else if (e.key === 'Escape') cancelRename();
                          }}
                        />
                        <button className={styles.iconBtn} title="Save name" onClick={commitRename}>✓</button>
                        <button className={styles.iconBtn} title="Cancel" onClick={cancelRename}>×</button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.savedMain}>
                          <div className={styles.savedName}>{route.name}</div>
                          <div className={styles.savedMeta}>
                            {filledStops} stop{filledStops === 1 ? '' : 's'} · saved {formatDate(route.createdAt)}
                          </div>
                        </div>
                        <div className={styles.savedActions} onClick={(e) => e.stopPropagation()}>
                          <button
                            className={styles.iconBtn}
                            title="Rename"
                            onClick={() => startRename(route)}
                          >
                            ✎
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Delete"
                            onClick={() => remove(route.id)}
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
