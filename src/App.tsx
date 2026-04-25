import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import MapView from './components/MapView';
import ModeToggle from './components/ModeToggle';
import ActivityToggle from './components/ActivityToggle';
import CoverageOverlay from './components/CoverageOverlay';
import RouteOverlay from './components/RouteOverlay';
import BrowseSidebar from './components/BrowseSidebar';
import RoutePlanner from './components/RoutePlanner';
import StreetViewPanel from './components/StreetViewPanel';
import RideControls from './components/RideControls';
import ApiKeyDialog from './components/ApiKeyDialog';
import LocationSearch, { type SearchTarget } from './components/LocationSearch';
import { SettingsIcon } from './assets';
import { useOverpassCycleways } from './hooks/useOverpassCycleways';
import { useStreetViewCoverage } from './hooks/useStreetViewCoverage';
import { useCyclingDirections } from './hooks/useCyclingDirections';
import { useStreetViewRider } from './hooks/useStreetViewRider';
import { useUserLocation } from './hooks/useUserLocation';
import { useApiKey } from './hooks/useApiKey';
import { useMapSession } from './hooks/useMapSession';
import { markEnvKeyDenied } from './services/apiKey';
import { samplePointsAlongPath } from './services/geometry';
import { SV_SAMPLE_INTERVAL_METERS } from './constants';
import { ACTIVITY_CONFIGS } from './config/activityConfig';
import type { AppMode, ActivityType, LatLng } from './types';
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
  const { segments: rawSegments, loading, error, tooZoomedOut } = useOverpassCycleways(isBrowse, activity);
  const { checkSegmentCoverage, checking, progress } = useStreetViewCoverage();
  const { routes, selectedIndex, route, loading: routeLoading, error: routeError, getRoute, selectRoute, clearRoute } = useCyclingDirections(config.travelModeKey);
  const { riderState, play, pause, next, prev, reset: resetRider, setSpeed } = useStreetViewRider();
  const { userLocation, requestLocation } = useUserLocation();
  const {
    segments,
    selectedSegment,
    streetViewPosition,
    streetViewHeading,
    handleSegmentClick,
    reset: resetMapSession,
  } = useMapSession(rawSegments, checkSegmentCoverage);

  const handleActivityChange = useCallback((next: ActivityType) => {
    setActivity(next);
    resetMapSession();
    clearRoute();
    resetRider([], false);
  }, [resetMapSession, clearRoute, resetRider]);

  // Rider position takes precedence over manual selection while riding
  const isRiding = riderState.points.length > 0;
  const effectivePosition = isRiding ? riderState.points[riderState.currentIndex] : streetViewPosition;
  const effectiveHeading = isRiding ? riderState.heading : streetViewHeading;

  const handleStartRide = useCallback((points: LatLng[]) => {
    const sampled = samplePointsAlongPath(points, SV_SAMPLE_INTERVAL_METERS);
    resetRider(sampled, true);
  }, [resetRider]);

  const handleRouteReady = useCallback(
    (origin: LatLng, destination: LatLng) => {
      getRoute(origin, destination);
    },
    [getRoute]
  );

  return (
    <>
      <header className="app-header">
        <h1>{config.appTitle}</h1>
        <div className="header-toggles">
          <LocationSearch onSelect={setSearchTarget} userLocation={userLocation} onRequestLocation={requestLocation} />
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
          <MapView userLocation={userLocation} searchTarget={searchTarget}>
            {isBrowse && (
              <CoverageOverlay
                segments={segments}
                onSegmentClick={handleSegmentClick}
              />
            )}
            {!isBrowse && (
              <RouteOverlay
                routes={routes}
                selectedIndex={selectedIndex}
                onSelectRoute={selectRoute}
              />
            )}
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
                onStartRide={handleStartRide}
                config={config}
              />
              <StreetViewPanel
                position={effectivePosition}
                heading={effectiveHeading}
                isRiding={isRiding}
                isPlaying={riderState.isPlaying}
                onPlay={play}
                onPause={pause}
              />
              {isRiding && (
                <RideControls
                  riderState={riderState}
                  onPlay={play}
                  onPause={pause}
                  onNext={next}
                  onPrev={prev}
                  onSpeedChange={setSpeed}
                />
              )}
            </>
          ) : (
            <>
              <RoutePlanner
                onRoute={handleRouteReady}
                onClear={clearRoute}
                loading={routeLoading}
                userLocation={userLocation}
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
                          {r.distance} &middot; {r.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn-go"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={() => route && handleStartRide(route.polyline)}
                  >
                    {config.actionVerb} this route
                  </button>
                </div>
              )}
              <StreetViewPanel
                position={effectivePosition}
                heading={effectiveHeading}
                isRiding={isRiding}
                isPlaying={riderState.isPlaying}
                onPlay={play}
                onPause={pause}
              />
              {isRiding && (
                <RideControls
                  riderState={riderState}
                  onPlay={play}
                  onPause={pause}
                  onNext={next}
                  onPrev={prev}
                  onSpeedChange={setSpeed}
                />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
