import { useState } from 'react';
import type { SavedRoute } from '@types';
import { ACTIVITY } from '@constants/activity';
import { useSavedRoutesStore } from '@store/savedRoutesStore';
import { useActivityStore } from '@store/activityStore';
import { useRouteImport } from '@hooks/useRouteImport';
import type { ImportedRoute } from '@services/routeImport';
import { CyclistIcon, RunnerIcon, ImportIcon } from '@assets';
import ExportRouteDialog from '@components/ExportRouteDialog';
import styles from './SavedRoutes.module.css';

interface SavedRoutesProps {
  open: boolean;
  onToggle: () => void;
  onLoad: (route: SavedRoute) => void;
  /** Called once the user confirms an imported file in the preview dialog. */
  onImport: (preview: ImportedRoute, name: string) => void;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function SavedRoutes({ open, onToggle, onLoad, onImport }: SavedRoutesProps) {
  const { routes, remove, rename } = useSavedRoutesStore();
  const { activity } = useActivityStore();
  const visibleRoutes = routes.filter((r) => r.activity === activity);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const exportingRoute = exportingId
    ? visibleRoutes.find((r) => r.id === exportingId) ?? null
    : null;

  const { openPicker, dragProps, isDraggingOver, draggedName, overlays } = useRouteImport(onImport);
  // Force-expand while a file is being dragged so the drop zone is visible
  // even if the user collapsed the section.
  const expanded = open || isDraggingOver;

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
    <div className="panel-section" {...dragProps}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <div className={styles.headerLeft}>
          <h3>Saved Routes</h3>
          <span className={styles.countBadge}>{visibleRoutes.length}</span>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.importBtn}
            onClick={(e) => { e.stopPropagation(); openPicker(); }}
            title="Import a route from .gpx, .kml, or .geojson"
            aria-label="Import route"
          >
            <ImportIcon width={14} height={14} />
            <span className={styles.importBtnLabel}>Import</span>
          </button>
          <svg
            className={`${styles.chevron}${open ? ` ${styles.chevronOpen}` : ''}`}
            width="16" height="8" viewBox="0 0 18 10"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="1,1 9,9 17,1" />
          </svg>
        </div>
      </div>
      <div className={`${styles.sectionBody}${expanded ? '' : ` ${styles.sectionBodyCollapsed}`}`}>
        <div>
          {isDraggingOver && (
            <div className={`${styles.empty} ${styles.dropZoneActive}`}>
              <strong>Drop to import</strong>
              <div className={styles.dropFilename}>{draggedName ?? 'Release to load this file'}</div>
            </div>
          )}
          {!isDraggingOver && visibleRoutes.length === 0 && (
            <div className={styles.empty}>
              <strong>No saved routes yet.</strong>
              <div className={styles.emptyBody}>
                Plan a route and hit <strong>Save</strong>, or{' '}
                <button type="button" className={styles.linkBtn} onClick={openPicker}>
                  import a file
                </button>.
              </div>
              <div className={styles.dropHint}>Drop a .gpx, .kml, or .geojson here</div>
            </div>
          )}
          {!isDraggingOver && visibleRoutes.length > 0 && (
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
                            title="Export"
                            onClick={() => setExportingId(route.id)}
                          >
                            ⤓
                          </button>
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
      {exportingRoute && (
        <ExportRouteDialog
          route={{
            name: exportingRoute.name,
            polyline: exportingRoute.route.polyline,
            stops: exportingRoute.stops,
            distance: exportingRoute.route.distance,
            duration: exportingRoute.route.duration,
          }}
          onClose={() => setExportingId(null)}
        />
      )}
      {overlays}
    </div>
  );
}
