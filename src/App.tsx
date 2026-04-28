import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import MapView from '@components/MapView';
import ModeToggle from '@components/ModeToggle';
import ActivityToggle from '@components/ActivityToggle';
import CoverageOverlay from '@components/CoverageOverlay';
import RouteOverlay from '@components/RouteOverlay';
import BrowseSidebar from '@components/BrowseSidebar';
import RoutePlanner from '@components/RoutePlanner';
import SavedRoutes from '@components/SavedRoutes';
import SaveRouteAction from '@components/SaveRouteAction';
import ExportRouteAction from '@components/ExportRouteAction';
import StreetViewPanel from '@components/StreetViewPanel';
import MovementControls from '@components/MovementControls';
import ApiKeyDialog from '@components/ApiKeyDialog';
import LocationSearch, { type SearchTarget } from '@components/LocationSearch';
import { AppLogoIcon, SettingsIcon } from '@assets';
import { useOverpassPaths } from '@hooks/useOverpassPaths';
import { useStreetViewCoverage } from '@hooks/useStreetViewCoverage';
import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { useDirectionsStore } from '@store/directionsStore';
import { useActivityStore } from '@store/activityStore';
import { useRoutePlannerStore } from '@store/routePlannerStore';
import { useApiKey } from '@hooks/useApiKey';
import { useMapSession } from '@hooks/useMapSession';
import { markEnvKeyDenied } from '@services/apiKey';
import { samplePointsAlongPath } from '@services/geometry';
import { SV_SAMPLE_INTERVAL_METERS, APP_MODE } from '@constants';
import { ACTIVITY_CONFIGS } from '@constants/activityConfig';
import type { AppMode, ActivityType, LatLng, PathSegment, SavedRoute } from '@types';
import styles from './App.module.css';

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

type AppContentProps = {
  keySource: 'env' | 'user' | null;
  onOpenSettings: () => void;
};

function AppContent({ keySource, onOpenSettings }: AppContentProps) {
  const { activity, setActivity } = useActivityStore();
  const [mode, setMode] = useState<AppMode>(APP_MODE.ROUTE);
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [savedOpen, setSavedOpen] = useState(true);
  const setStops = useRoutePlannerStore((s) => s.setStops);
  const clearStops = useRoutePlannerStore((s) => s.clear);

  const config = ACTIVITY_CONFIGS[activity];

  // Apply theme via data attribute
  useEffect(() => {
    document.documentElement.dataset.activity = activity;
    return () => { delete document.documentElement.dataset.activity; };
  }, [activity]);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isStacked = windowWidth < 768;

  const [sideWidth, setSideWidth] = useState(() => Math.round(window.innerWidth * 0.35));
  const [mapHeight, setMapHeight] = useState(() => Math.round((window.innerHeight - 48) * 0.5));
  const dragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      if (isStacked) {
        const newMapHeight = e.clientY - rect.top;
        setMapHeight(Math.max(200, Math.min(newMapHeight, rect.height - 200)));
      } else {
        const newSideWidth = rect.right - e.clientX;
        setSideWidth(Math.max(280, Math.min(newSideWidth, rect.width - 300)));
      }
    };
    const onMouseUp = () => { dragging.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [isStacked]);

  const isBrowse = mode === APP_MODE.BROWSE;
  const { segments: rawSegments, loading, error, tooZoomedOut } = useOverpassPaths(isBrowse);
  const { checkSegmentCoverage, checking, progress } = useStreetViewCoverage();
  const { routes, selectedIndex, loading: routeLoading, error: routeError, getRoute, setSavedRoute, selectRoute, clearRoute } = useDirectionsStore();
  const route = routes[selectedIndex] ?? null;
  const stops = useRoutePlannerStore((s) => s.stops);
  const { points: moverPoints, reset: resetPlayback } = useStreetViewPlaybackStore();
  const {
    segments,
    handleSegmentClick: handleSegmentClickRaw,
    reset: resetMapSession,
  } = useMapSession(rawSegments, checkSegmentCoverage);

  const handleSegmentClick = useCallback(
    (segment: PathSegment, latLng: google.maps.LatLng) => {
      resetPlayback([], false);
      return handleSegmentClickRaw(segment, latLng);
    },
    [handleSegmentClickRaw, resetPlayback]
  );

  const handleActivityChange = useCallback((next: ActivityType) => {
    setActivity(next);
    resetMapSession();
    clearRoute();
    resetPlayback([], false);
  }, [setActivity, resetMapSession, clearRoute, resetPlayback]);

  const isMoving = moverPoints.length > 0;

  const handleStartMovement = useCallback((points: LatLng[]) => {
    const sampled = samplePointsAlongPath(points, SV_SAMPLE_INTERVAL_METERS);
    resetPlayback(sampled, true);
  }, [resetPlayback]);

  const handleRouteReady = useCallback(
    (stops: LatLng[]) => {
      getRoute(stops, config.travelModeKey);
    },
    [getRoute, config.travelModeKey]
  );

  const handleClearRoute = useCallback(() => {
    clearRoute();
    resetMapSession();
    resetPlayback([], false);
  }, [clearRoute, resetMapSession, resetPlayback]);

  // When the user picks a new place from the header search bar, wipe any
  // in-progress route so they aren't left with stale stops from a different city.
  useEffect(() => {
    if (!searchTarget) return;
    clearStops();
    clearRoute();
    resetMapSession();
    resetPlayback([], false);
  }, [searchTarget, clearStops, clearRoute, resetMapSession, resetPlayback]);

  const handleLoadSavedRoute = useCallback(
    (saved: SavedRoute) => {
      if (saved.activity !== activity) {
        setActivity(saved.activity);
        resetMapSession();
      }
      resetPlayback([], false);
      setStops(saved.stops);
      setSavedRoute(saved.route);
      setPlannerOpen(false);
    },
    [activity, setActivity, resetMapSession, resetPlayback, setStops, setSavedRoute]
  );

  return (
    <>
      <header className={styles.appHeader}>
        <AppLogoIcon className={styles.appLogo} />
        <LocationSearch onSelect={setSearchTarget} />
        <div className={styles.headerControls}>
          <ActivityToggle onChange={handleActivityChange} />
          <ModeToggle mode={mode} onChange={setMode} />
          {keySource !== 'env' && (
            <button
              className={styles.btnIcon}
              title="API key settings"
              aria-label="API key settings"
              onClick={onOpenSettings}
            >
              <SettingsIcon />
            </button>
          )}
        </div>
      </header>
      <main className={styles.appMain} ref={mainRef}>
        <div className={styles.mapContainer} style={isStacked ? { flex: 'none', height: mapHeight } : { flex: 1, minWidth: 300 }}>
          <MapView searchTarget={searchTarget} isRouteMode={!isBrowse}>
            {isBrowse && (
              <CoverageOverlay
                segments={segments}
                onSegmentClick={handleSegmentClick}
              />
            )}
            {!isBrowse && <RouteOverlay />}
          </MapView>
        </div>
        <div
          className={`${styles.resizeHandle}${isStacked ? ` ${styles.resizeHandleVertical}` : ''}`}
          onMouseDown={() => { dragging.current = true; document.body.style.cursor = isStacked ? 'row-resize' : 'col-resize'; }}
        />
        <div className={styles.sidePanel} style={isStacked ? {} : { width: sideWidth, flex: 'none' }}>
          {isBrowse ? (
            <>
              <BrowseSidebar
                loading={loading}
                error={error}
                tooZoomedOut={tooZoomedOut}
                segmentCount={segments.length}
                checking={checking}
                coverageProgress={progress}
                onStartMovement={handleStartMovement}
                config={config}
              />
              <StreetViewPanel />
              {isMoving && <MovementControls />}
            </>
          ) : (
            <>
              <RoutePlanner
                onRoute={handleRouteReady}
                onClear={handleClearRoute}
                loading={routeLoading}
                open={plannerOpen}
                onToggle={() => setPlannerOpen((v) => !v)}
              />
              <SavedRoutes
                open={savedOpen}
                onToggle={() => setSavedOpen((v) => !v)}
                onLoad={handleLoadSavedRoute}
              />
              {routeError && (
                <div className="panel-message" style={{ color: 'var(--red)' }}>
                  {routeError}
                </div>
              )}
              {routes.length > 0 && (
                <div className="panel-section">
                  <h3>Routes ({routes.length})</h3>
                  <div className={styles.routeList}>
                    {routes.map((r, i) => (
                      <div
                        key={i}
                        className={`${styles.routeOption}${i === selectedIndex ? ` ${styles.routeOptionSelected}` : ''}`}
                        onClick={() => selectRoute(i)}
                      >
                        <div className={styles.routeOptionLabel}>Route {i + 1}</div>
                        <div className={styles.routeOptionInfo}>
                          {r.distance} · {r.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.actionRow}>
                    <button
                      className="btn-go"
                      onClick={() => { if (route) { handleStartMovement(route.polyline); setPlannerOpen(false); } }}
                    >
                      {config.actionVerb}
                    </button>
                    {route && (
                      <>
                        <SaveRouteAction route={route} stops={stops} activity={activity} />
                        <ExportRouteAction route={route} stops={stops} />
                      </>
                    )}
                  </div>
                </div>
              )}
              <StreetViewPanel />
              {isMoving && <MovementControls />}
            </>
          )}
        </div>
      </main>
    </>
  );
}
