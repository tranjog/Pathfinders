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
import { useOverpassCycleways } from './hooks/useOverpassCycleways';
import { useStreetViewCoverage } from './hooks/useStreetViewCoverage';
import { useCyclingDirections } from './hooks/useCyclingDirections';
import { useStreetViewRider } from './hooks/useStreetViewRider';
import { useUserLocation } from './hooks/useUserLocation';
import { useApiKey } from './hooks/useApiKey';
import { computeHeading, samplePointsAlongPath } from './services/geometry';
import { SV_SAMPLE_INTERVAL_METERS } from './constants';
import { ACTIVITY_CONFIGS } from './config/activityConfig';
import type { AppMode, ActivityType, CyclewaySegment, LatLng } from './types';
import './App.css';

declare global {
  interface Window { gm_authFailure?: () => void }
}

export default function App() {
  const { key, source, saveKey, clearKey } = useApiKey();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    window.gm_authFailure = () => {
      setAuthError('Google rejected the key. Check restrictions and that required APIs are enabled.');
      if (source === 'user') {
        clearKey();
        setSettingsOpen(true);
      }
    };
    return () => { delete window.gm_authFailure; };
  }, [source, clearKey]);

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
  const [selectedSegment, setSelectedSegment] = useState<CyclewaySegment | null>(null);
  const [streetViewPosition, setStreetViewPosition] = useState<LatLng | null>(null);
  const [streetViewHeading, setStreetViewHeading] = useState(0);
  const [checkedSegments, setCheckedSegments] = useState<Map<number, CyclewaySegment>>(new Map());

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
  const { riderState, play, pause, next, prev, reset, setSpeed } = useStreetViewRider();
  const { userLocation } = useUserLocation();

  // Reset stale state when activity changes
  useEffect(() => {
    setSelectedSegment(null);
    setStreetViewPosition(null);
    setStreetViewHeading(0);
    setCheckedSegments(new Map());
    clearRoute();
    reset([], false);
  }, [activity, clearRoute, reset]);

  // Merge coverage data into segments
  const segments = rawSegments.map(s => checkedSegments.get(s.id) ?? s);

  // Sync rider position to Street View panel
  useEffect(() => {
    if (riderState.points.length > 0) {
      setStreetViewPosition(riderState.points[riderState.currentIndex]);
      setStreetViewHeading(riderState.heading);
    }
  }, [riderState.currentIndex, riderState.heading, riderState.points]);

  const handleSegmentClick = useCallback(
    async (segment: CyclewaySegment, latLng: google.maps.LatLng) => {
      const position = { lat: latLng.lat(), lng: latLng.lng() };
      setStreetViewPosition(position);
      setSelectedSegment(segment);

      const pts = segment.points;
      if (pts.length >= 2) {
        let minDist = Infinity;
        let idx = 0;
        for (let i = 0; i < pts.length; i++) {
          const d = Math.abs(pts[i].lat - position.lat) + Math.abs(pts[i].lng - position.lng);
          if (d < minDist) { minDist = d; idx = i; }
        }
        const nextIdx = Math.min(idx + 1, pts.length - 1);
        if (idx !== nextIdx) {
          setStreetViewHeading(computeHeading(pts[idx], pts[nextIdx]));
        }
      }

      if (!segment.coverageChecked) {
        const result = await checkSegmentCoverage(segment);
        setCheckedSegments(prev => {
          const updated = new Map(prev);
          updated.set(segment.id, result.segment);
          return updated;
        });
        setSelectedSegment(result.segment);
      }
    },
    [checkSegmentCoverage]
  );

  const handleStartRide = useCallback((points: LatLng[]) => {
    const sampled = samplePointsAlongPath(points, SV_SAMPLE_INTERVAL_METERS);
    reset(sampled, true);
  }, [reset]);

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
          <ActivityToggle activity={activity} onChange={setActivity} />
          <ModeToggle mode={mode} onChange={setMode} />
          {keySource !== 'env' && (
            <button
              className="btn-icon"
              title="API key settings"
              aria-label="API key settings"
              onClick={onOpenSettings}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      </header>
      <main className="app-main" ref={mainRef}>
        <div className="map-container" style={{ flex: 1, minWidth: 300 }}>
          <MapView userLocation={userLocation}>
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
                position={streetViewPosition}
                heading={streetViewHeading}
                isRiding={riderState.points.length > 0}
                isPlaying={riderState.isPlaying}
                onPlay={play}
                onPause={pause}
              />
              {riderState.points.length > 0 && (
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
                position={streetViewPosition}
                heading={streetViewHeading}
                isRiding={riderState.points.length > 0}
                isPlaying={riderState.isPlaying}
                onPlay={play}
                onPause={pause}
              />
              {riderState.points.length > 0 && (
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
