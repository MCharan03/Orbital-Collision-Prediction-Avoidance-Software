import { useState, useEffect, useCallback, Component } from 'react';
import Scene from '../Globe/Scene';
import Header from '../UI/Header';
import TimeSlider from '../UI/TimeSlider';
import Sidebar from '../Sidebar/Sidebar';
import StatsPanel from './StatsPanel';
import AlertsPanel from '../Alerts/AlertsPanel';
import AlertModal from '../Alerts/AlertModal';
import ASWANPanel from '../ASWAN/ASWANPanel';
import TrafficManagerAI from '../UI/TrafficManagerAI';
import NegotiationFeed from '../Alerts/NegotiationFeed';
import ForecastPanel from '../Forecast/ForecastPanel';
import { 
  fetchDashboard, 
  fetchTrail, 
  fetchSpaceWeather, 
  fetchNetworkStatus,
  fetchAutoResolutions, 
  fetchForecast 
} from '../../utils/api';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
          [WebGL Render Error] Reload the page or try a simpler scene.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  // ── State ──────────────────────────────────
  const [group, setGroup] = useState('stations');
  const [positions, setPositions] = useState([]);
  const [collisions, setCollisions] = useState([]);
  const [collisionSummary, setCollisionSummary] = useState(null);
  const [selectedSat, setSelectedSat] = useState(null);
  const [modalAlert, setModalAlert] = useState(null);
  const [trail, setTrail] = useState(null);
  const [deviationTrail, setDeviationTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [resolutions, setResolutions] = useState(null);
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // ── Digital Twin Controls ─────────────────
  const [dtGrid, setDtGrid] = useState(true);
  const [dtBeams, setDtBeams] = useState(true);
  const [dtLabels, setDtLabels] = useState(true);
  const [dtRotate, setDtRotate] = useState(true);

  // ── ASWAN State ────────────────────────────
  const [weatherData, setWeatherData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [weatherZones, setWeatherZones] = useState([]);

  // ── Traffic Manager AI State ───────────────
  const [aiHighlightedIds, setAiHighlightedIds] = useState([]);
  const [simulatedManeuver, setSimulatedManeuver] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('full-view-active', isFullView);
    return () => document.body.classList.remove('full-view-active');
  }, [isFullView]);

  // ── Data Fetching ──────────────────────────
  const loadData = useCallback(async (timeISO = null) => {
    try {
      setError(null);
      const data = await fetchDashboard(group, 500, timeISO);
      setPositions(data.positions || []);
      setCollisions(data.collisions || []);
      setCollisionSummary(data.collision_summary || null);
      setLastUpdate(data.time);
    } catch (err) {
      console.error('[Forge-X] Failed to load dashboard:', err);
      setError(err.message || 'Failed to connect to backend');
    } finally {
      setLoading(false);
      setTimeLoading(false);
    }
  }, [group]);

  // ── ASWAN Data Fetching ────────────────────
  const loadASWAN = useCallback(async (timeISO = null) => {
    try {
      const [weather, network] = await Promise.all([
        fetchSpaceWeather(group, timeISO).catch(() => null),
        fetchNetworkStatus(group, timeISO).catch(() => null),
      ]);

      if (weather) {
        setWeatherData(weather);
        setWeatherZones(weather.risk_zones || []);
      }
      if (network) {
        setNetworkData(network);
      }
    } catch (err) {
      console.error('[ASWAN] Failed to load ASWAN data:', err);
    }
  }, [group]);

  // ── Forecast Fetching ──────────────────────
  const loadForecast = async () => {
    setForecastLoading(true);
    try {
      const data = await fetchForecast(group, 120);
      setForecast(data);
    } catch (err) {
      console.error('[Forge-X] Failed to load forecast:', err);
      setForecast(null);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSelectedSat(null);
    setTrail(null);
    setDeviationTrail(null);
    setForecast(null);
    loadData();
    loadASWAN();
    loadForecast();
  }, [group, loadData, loadASWAN]);

  // Auto-refresh every 15 seconds for near-real-time satellite movement
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
      loadASWAN();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData, loadASWAN]);

  // ── Satellite Selection ────────────────────
  const handleSelectSatellite = useCallback(async (sat) => {
    setSelectedSat(sat);
    try {
      const data = await fetchTrail(sat.norad_id, group, 90);
      setTrail(data.trail || []);
    } catch (err) {
      console.error('[Forge-X] Failed to fetch trail:', err);
      setTrail(null);
    }
  }, [group]);

  // ── Time Slider ────────────────────────────
  const handleTimeChange = useCallback((newTime) => {
    setTimeLoading(true);
    const iso = newTime.toISOString();
    loadData(iso);
    loadASWAN(iso);
  }, [loadData, loadASWAN]);

  // ── Alert Click ────────────────────────────
  const handleAlertClick = useCallback((collision) => {
    const sat = positions.find(p => p.norad_id === collision.sat1_norad_id);
    if (sat) handleSelectSatellite(sat);
    setModalAlert(collision);
  }, [positions, handleSelectSatellite]);

  const handleSimulateManeuver = useCallback((maneuver, collision) => {
    setSimulatedManeuver({ maneuver, collision });
  }, []);

  const handleAutoResolve = async () => {
    setResolvingLoading(true);
    setResolutions(null); // Clear previous feed
    try {
      const data = await fetchAutoResolutions(group);
      setResolutions(data.resolutions || []);
    } catch (err) {
      console.error("[Forge-X] Failed to auto resolve", err);
    } finally {
      setResolvingLoading(false);
    }
  };

  // ── Loading Screen ─────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-orbit"></div>
        <div className="loading-text">
          {error ? `⚠ ${error}` : 'CALIBRATING ORBITAL TELEMETRY...'}
        </div>
        {error && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Make sure the Flask backend is running on port 5000.
              <br />
              <code style={{ color: 'var(--color-primary-light)' }}>
                cd backend && python app.py
              </code>
            </div>
            <button
              onClick={() => { setLoading(true); setError(null); loadData(); }}
              className="time-btn"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main Layout ────────────────────────────
  return (
    <div className="app-layout">
      {/* Absolute Background Globe */}
      <div className="globe-container">
        <ErrorBoundary>
          <Scene
            positions={positions}
            collisions={collisions}
            selectedSatId={selectedSat?.norad_id}
            onSelectSatellite={handleSelectSatellite}
            trail={trail}
            weatherZones={weatherZones}
            aiHighlightedIds={aiHighlightedIds}
            simulatedManeuver={simulatedManeuver}
            deviationTrail={deviationTrail}
            showGrid={dtGrid}
            showBeams={dtBeams}
            showLabels={dtLabels}
            autoRotate={dtRotate}
          />
        </ErrorBoundary>

        {/* Globe overlay badges */}
        <div className="globe-overlay" style={{ opacity: isFullView ? 0 : 1, transition: 'opacity 0.4s', pointerEvents: isFullView ? 'none' : 'auto' }}>
          <div className="overlay-badge dt-badge">
            <span className="dt-pulse"></span>
            DIGITAL TWIN
          </div>
          <div className="overlay-badge">
            🛰 <span className="count">{positions.length}</span> satellites
          </div>
          {collisionSummary && collisionSummary.total_events > 0 && (
            <div className="overlay-badge" style={{
              borderColor: collisionSummary.high_risk > 0
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(245, 158, 11, 0.3)'
            }}>
              ⚠ <span className="count" style={{
                color: collisionSummary.high_risk > 0 ? '#ef4444' : '#f59e0b'
              }}>
                {collisionSummary.total_events}
              </span> conjunction events
            </div>
          )}
          {weatherData && weatherData.active_event_count > 0 && (
            <div className="overlay-badge" style={{
              borderColor: 'rgba(255, 107, 53, 0.3)'
            }}>
              ⚡ <span className="count" style={{ color: '#ff6b35' }}>
                {weatherData.active_event_count}
              </span> weather events
            </div>
          )}
          {selectedSat && (
            <div className="overlay-badge" style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}>
              📡 <span className="count">{selectedSat.name}</span>
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>
                Alt: {selectedSat.alt?.toFixed(0)} km
              </span>
            </div>
          )}
        </div>

        {/* Digital Twin Controls */}
        <div className="dt-controls" style={{ opacity: isFullView ? 0 : 1, pointerEvents: isFullView ? 'none' : 'auto' }}>
          <div className="dt-controls-label">DIGITAL TWIN</div>
          <button
            className={`dt-btn ${dtGrid ? 'active' : ''}`}
            onClick={() => setDtGrid(!dtGrid)}
            title="Toggle Orbital Grid"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Grid
          </button>
          <button
            className={`dt-btn ${dtBeams ? 'active' : ''}`}
            onClick={() => setDtBeams(!dtBeams)}
            title="Toggle Collision Beams"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l16 16"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="20" r="2"/>
            </svg>
            Beams
          </button>
          <button
            className={`dt-btn ${dtLabels ? 'active' : ''}`}
            onClick={() => setDtLabels(!dtLabels)}
            title="Toggle Satellite Labels"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Labels
          </button>
          <button
            className={`dt-btn ${dtRotate ? 'active' : ''}`}
            onClick={() => setDtRotate(!dtRotate)}
            title="Toggle Auto-Rotate"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            </svg>
            Rotate
          </button>
        </div>

        {/* Floating Full View Toggle Button */}
        <button 
          className="time-btn" 
          onClick={() => setIsFullView(!isFullView)}
          title={isFullView ? "Exit Full View" : "Enter Full View"}
          style={{ 
            position: 'absolute', 
            bottom: 35, 
            left: '50%', 
            transform: 'translateX(320px)',
            zIndex: 60, 
            fontFamily: 'var(--font-mono)', 
            padding: '12px 24px', 
            borderRadius: '24px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
            background: isFullView ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
            border: isFullView ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          {isFullView ? "✕ Exit Full View" : "⛶ Full View"}
        </button>

        {/* Time simulation slider */}
        <TimeSlider onTimeChange={handleTimeChange} isLoading={timeLoading} />
      </div>

      {/* Floating UI Overlays */}
      <div className="app-main">
        <Header
          group={group}
          onGroupChange={setGroup}
          satelliteCount={positions.length}
          lastUpdate={lastUpdate}
        />

        <div className="floating-ui-layer">
          {/* Left Column Widgets */}
          <div className="floating-left-widgets">
            <StatsPanel
              satelliteCount={positions.length}
              collisionSummary={collisionSummary}
              weatherData={weatherData}
              networkData={networkData}
            />
            {/* ASWAN Panel below stats */}
            <ASWANPanel
              weatherData={weatherData}
              networkData={networkData}
            />
            <ForecastPanel
              forecast={forecast}
              loading={forecastLoading}
            />
          </div>

          {/* Right Column Widgets */}
          <div className="floating-right-widgets">
            <button 
              className="time-btn" 
              style={{ width: '100%', marginBottom: '16px', background: 'rgba(168, 85, 247, 0.1)', borderColor: '#a855f7', color: '#a855f7', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}
              onClick={handleAutoResolve}
              disabled={resolvingLoading}
            >
              <span style={resolvingLoading ? { animation: 'pulse 1.5s infinite' } : {}}>⚡</span>
              {resolvingLoading ? 'INITIALIZING AI RESOLVER...' : 'AUTONOMOUS RESOLUTION START'}
            </button>

            <AlertsPanel
              collisions={collisions}
              onAlertClick={handleAlertClick}
              weatherEvents={weatherData?.events}
            />

            <div className="sidebar" style={{ flex: 1, minHeight: 0 }}>
              <Sidebar
                positions={positions}
                selectedSatId={selectedSat?.norad_id}
                onSelectSatellite={handleSelectSatellite}
              />
            </div>
          </div>
        </div>
      </div>

      {modalAlert && (
        <AlertModal 
          collision={modalAlert} 
          group={group} 
          onClose={() => {
            setModalAlert(null);
            setDeviationTrail(null);
            setSimulatedManeuver(null);
          }} 
          onSimulateManeuver={handleSimulateManeuver}
          onSimulationComplete={setDeviationTrail}
        />
      )}

      {/* Anti-Gravity Traffic Manager AI */}
      <TrafficManagerAI
        satelliteContext={positions}
        onHighlightSatellites={(ids) => {
          setAiHighlightedIds(ids);
          setTimeout(() => setAiHighlightedIds([]), 12000);
        }}
      />

      {resolutions && (
        <NegotiationFeed resolutions={resolutions} onClose={() => setResolutions(null)} />
      )}
    </div>
  );
}
