import { useState, useCallback, useEffect } from 'react';
import MapView from '@components/MapView';
import ModeToggle from '@components/ModeToggle';
import ActivityToggle from '@components/ActivityToggle';
import CoverageOverlay from '@components/CoverageOverlay';
import RouteOverlay from '@components/RouteOverlay';
import BrowseSidebar from '@components/BrowseSidebar';
import RoutePlanner from '@components/RoutePlanner';
import SavedRoutes from '@components/SavedRoutes';
import RouteAlternatives from '@components/RouteAlternatives';
import StreetViewPanel from '@components/StreetViewPanel';
import MovementControls from '@components/MovementControls';
import LocationSearch, { type SearchTarget } from '@components/LocationSearch';
import { AppLogoIcon, SettingsIcon } from '@assets';
import { useOverpassPaths } from '@hooks/useOverpassPaths';
import { useStreetViewCoverage } from '@hooks/useStreetViewCoverage';
import { useMapSession } from '@hooks/useMapSession';
import { useWindowWidth } from '@hooks/useWindowWidth';
import { useResizableLayout } from '@hooks/useResizableLayout';
import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { useDirectionsStore } from '@store/directionsStore';
import { useActivityStore } from '@store/activityStore';
import { useRoutePlannerStore } from '@store/routePlannerStore';
import { useSavedRoutesStore } from '@store/savedRoutesStore';
import { samplePointsAlongPath } from '@services/geometry';
import type { ImportedRoute } from '@services/routeImport';
import { SV_SAMPLE_INTERVAL_METERS } from '@constants/tuning';
import { APP_MODE, type AppMode } from '@constants/appMode';
import type { ActivityType } from '@constants/activity';
import { ACTIVITY_CONFIGS } from '@constants/activityConfig';
import type { LatLng, PathSegment, SavedRoute, SavedRouteData, Stop } from '@types';
import styles from './AppContent.module.css';

interface AppContentProps {
  keySource: 'env' | 'user' | null;
  onOpenSettings: () => void;
}

export default function AppContent({ keySource, onOpenSettings }: AppContentProps) {
  const { activity, setActivity } = useActivityStore();
  const [mode, setMode] = useState<AppMode>(APP_MODE.ROUTE);
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [savedOpen, setSavedOpen] = useState(true);
  const setStops = useRoutePlannerStore((s) => s.setStops);
  const clearStops = useRoutePlannerStore((s) => s.clear);
  const saveRoute = useSavedRoutesStore((s) => s.save);

  const config = ACTIVITY_CONFIGS[activity];

  // Apply theme via data attribute
  useEffect(() => {
    document.documentElement.dataset.activity = activity;
    return () => { delete document.documentElement.dataset.activity; };
  }, [activity]);

  const windowWidth = useWindowWidth();
  const isStacked = windowWidth < 768;
  const { mainRef, sideWidth, mapHeight, startDrag } = useResizableLayout(isStacked);

  const isBrowse = mode === APP_MODE.BROWSE;
  const { segments: rawSegments, loading, error, tooZoomedOut } = useOverpassPaths(isBrowse);
  const { checkSegmentCoverage, checking, progress } = useStreetViewCoverage();
  const { loading: routeLoading, error: routeError, getRoute, setSavedRoute, clearRoute } = useDirectionsStore();
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

  const handleStartFromRoute = useCallback((points: LatLng[]) => {
    handleStartMovement(points);
    setPlannerOpen(false);
  }, [handleStartMovement]);

  const handleRouteReady = useCallback(
    (newStops: LatLng[]) => {
      getRoute(newStops, config.travelModeKey);
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

  // Shared "display a complete route on the map" sequence. Used by both
  // saved-route reload and file import — they only differ in what comes
  // before (activity switch / persistence) and after (which panels open).
  // Note: doesn't touch mapSession; callers decide whether the Browse-mode
  // segment cache should be invalidated (e.g. only when the activity changes).
  const renderRoute = useCallback(
    (newStops: Stop[], route: SavedRouteData) => {
      resetPlayback([], false);
      setStops(newStops);
      setSavedRoute(route);
      setPlannerOpen(false);
    },
    [resetPlayback, setStops, setSavedRoute]
  );

  const handleLoadSavedRoute = useCallback(
    (saved: SavedRoute) => {
      if (saved.activity !== activity) {
        setActivity(saved.activity);
        resetMapSession();
      }
      renderRoute(saved.stops, saved.route);
    },
    [activity, setActivity, resetMapSession, renderRoute]
  );

  const handleImportRoute = useCallback(
    (preview: ImportedRoute, name: string) => {
      // Persist under the current activity, then render exactly like a saved route.
      saveRoute(name, activity, preview.stops, preview.route);
      renderRoute(preview.stops, preview.route);
      setSavedOpen(true);
    },
    [saveRoute, activity, renderRoute]
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
          onMouseDown={startDrag}
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
                onImport={handleImportRoute}
              />
              {routeError && (
                <div className="panel-message" style={{ color: 'var(--red)' }}>
                  {routeError}
                </div>
              )}
              <RouteAlternatives
                stops={stops}
                activity={activity}
                config={config}
                onStart={handleStartFromRoute}
              />
              <StreetViewPanel />
              {isMoving && <MovementControls />}
            </>
          )}
        </div>
      </main>
    </>
  );
}
