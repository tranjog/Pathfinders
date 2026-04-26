import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import MapView from '@components/MapView';
import ModeToggle from '@components/ModeToggle';
import ActivityToggle from '@components/ActivityToggle';
import CoverageOverlay from '@components/CoverageOverlay';
import RouteOverlay from '@components/RouteOverlay';
import BrowseSidebar from '@components/BrowseSidebar';
import RoutePlanner from '@components/RoutePlanner';
import StreetViewPanel from '@components/StreetViewPanel';
import MovementControls from '@components/MovementControls';
import ApiKeyDialog from '@components/ApiKeyDialog';
import LocationSearch, { type SearchTarget } from '@components/LocationSearch';
import { SettingsIcon } from '@assets';
import { useOverpassPaths } from '@hooks/useOverpassPaths';
import { useStreetViewCoverage } from '@hooks/useStreetViewCoverage';
import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { useDirectionsStore } from '@store/directionsStore';
import { useApiKey } from '@hooks/useApiKey';
import { useMapSession } from '@hooks/useMapSession';
import { markEnvKeyDenied } from '@services/apiKey';
import { samplePointsAlongPath } from '@services/geometry';
import { SV_SAMPLE_INTERVAL_METERS } from '@constants';
import { ACTIVITY_CONFIGS } from '@constants/activityConfig';
import type { AppMode, ActivityType, LatLng, PathSegment } from '@types';
import './App.css';

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
  const [activity, setActivity] = useState<ActivityType>('cycling');
  const [mode, setMode] = useState<AppMode>('browse');
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);

  const config = ACTIVITY_CONFIGS[activity];

  // Apply theme via data attribute
  useEffect(() => {
    document.documentElement.dataset.activity = activity;
    return () => { delete document.documentElement.dataset.activity; };
  }, [activity]);

  const [sideWidth, setSideWidth] = useState(() => Math.round(window.innerWidth * 0.35));
  const dragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const newSideWidth = rect.right - e.clientX;
      setSideWidth(Math.max(280, Math.min(newSideWidth, rect.width - 300)));
    };
    const onMouseUp = () => { dragging.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const isBrowse = mode === 'browse';
  const { segments: rawSegments, loading, error, tooZoomedOut } = useOverpassPaths(isBrowse, activity);
  const { checkSegmentCoverage, checking, progress } = useStreetViewCoverage();
  const { routes, selectedIndex, loading: routeLoading, error: routeError, getRoute, selectRoute, clearRoute } = useDirectionsStore();
  const route = routes[selectedIndex] ?? null;
  const { points: moverPoints, currentIndex: moverIndex, heading: moverHeading, reset: resetPlayback } = useStreetViewPlaybackStore();
  const {
    segments,
    selectedSegment,
    streetViewPosition,
    streetViewHeading,
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
  }, [resetMapSession, clearRoute, resetPlayback]);

  const isMoving = moverPoints.length > 0;
  const effectivePosition = isMoving ? moverPoints[moverIndex] : streetViewPosition;
  const effectiveHeading = isMoving ? moverHeading : streetViewHeading;

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

  return (
    <>
      <header className="app-header">
        <h1>{config.appTitle}</h1>
        <div className="header-toggles">
          <LocationSearch onSelect={setSearchTarget} />
          <ActivityToggle activity={activity} onChange={handleActivityChange} />
          <ModeToggle mode={mode} onChange={setMode} />
          {keySource !== 'env' && (
            <button
              className="btn-icon"
              title="API key settings"
              aria-label="API key settings"
              onClick={onOpenSettings}
            >
              <SettingsIcon />
            </button>
          )}
        </div>
      </header>
      <main className="app-main" ref={mainRef}>
        <div className="map-container" style={{ flex: 1, minWidth: 300 }}>
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
          className="resize-handle"
          onMouseDown={() => { dragging.current = true; document.body.style.cursor = 'col-resize'; }}
        />
        <div className="side-panel" style={{ width: sideWidth, flex: 'none' }}>
          {isBrowse ? (
            <>
              <BrowseSidebar
                loading={loading}
                error={error}
                tooZoomedOut={tooZoomedOut}
                segmentCount={segments.length}
                selectedSegment={selectedSegment}
                checking={checking}
                coverageProgress={progress}
                onStartMovement={handleStartMovement}
                config={config}
              />
              <StreetViewPanel
                position={effectivePosition}
                heading={effectiveHeading}
              />
              {isMoving && <MovementControls />}
            </>
          ) : (
            <>
              <RoutePlanner
                onRoute={handleRouteReady}
                onClear={clearRoute}
                loading={routeLoading}
              />
              {routeError && (
                <div className="panel-message" style={{ color: 'var(--red)' }}>
                  {routeError}
                </div>
              )}
              {routes.length > 0 && (
                <div className="panel-section">
                  <h3>Routes ({routes.length})</h3>
                  <div className="route-list">
                    {routes.map((r, i) => (
                      <div
                        key={i}
                        className={`route-option ${i === selectedIndex ? 'route-option--selected' : ''}`}
                        onClick={() => selectRoute(i)}
                      >
                        <div className="route-option-label">Route {i + 1}</div>
                        <div className="route-option-info">
                          {r.distance} · {r.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn-go"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={() => route && handleStartMovement(route.polyline)}
                  >
                    {config.actionVerb} this route
                  </button>
                </div>
              )}
              <StreetViewPanel
                position={effectivePosition}
                heading={effectiveHeading}
              />
              {isMoving && <MovementControls />}
            </>
          )}
        </div>
      </main>
    </>
  );
}
