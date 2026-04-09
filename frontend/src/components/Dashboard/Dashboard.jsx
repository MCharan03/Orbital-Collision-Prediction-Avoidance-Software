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

  // ── Active Tab ─────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');

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
      console.error('[Orbix] Failed to load dashboard:', err);
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
      console.error('[Orbix] Failed to load forecast:', err);
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
      console.error('[Orbix] Failed to fetch trail:', err);
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
    setResolutions(null);
    try {
      const data = await fetchAutoResolutions(group);
      setResolutions(data.resolutions || []);
    } catch (err) {
      console.error("[Orbix] Failed to auto resolve", err);
    } finally {
      setResolvingLoading(false);
    }
  };

  // ── Tab Definitions ────────────────────────
  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: '🌐' },
    { id: 'forecast', label: 'Forecast', icon: '📊' },
    { id: 'aswan', label: 'ASWAN', icon: '⚡' },
    { id: 'ai', label: 'AI Traffic', icon: '🤖' },
  ];

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

  // ── Render Left Panel Content Based on Active Tab ──
  const renderLeftPanel = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <StatsPanel
              satelliteCount={positions.length}
              collisionSummary={collisionSummary}
              weatherData={weatherData}
              networkData={networkData}
            />
            <ForecastPanel
              forecast={forecast}
              loading={forecastLoading}
            />
          </>
        );
      case 'forecast':
        return (
          <div className="tab-full-panel">
            <ForecastPanel
              forecast={forecast}
              loading={forecastLoading}
              expanded={true}
            />
          </div>
        );
      case 'aswan':
        return (
          <div className="tab-full-panel">
            <ASWANPanel
              weatherData={weatherData}
              networkData={networkData}
            />
          </div>
        );
      case 'ai':
        return (
          <div className="tab-full-panel ai-tab-panel">
            <TrafficManagerAI
              satelliteContext={positions}
              onHighlightSatellites={(ids) => {
                setAiHighlightedIds(ids);
                setTimeout(() => setAiHighlightedIds([]), 12000);
              }}
              embedded={true}
            />
          </div>
        );
      default:
        return null;
    }
  };

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

        {/* Unified Bottom Dock */}
        <div className="unified-bottom-dock" style={{ opacity: isFullView ? 0 : 1 }}>
          <div className="dt-controls-compact">
            <button className={`dt-btn-mini ${dtGrid ? 'active' : ''}`} onClick={() => setDtGrid(!dtGrid)} title="Grid">
              🌐
            </button>
            <button className={`dt-btn-mini ${dtBeams ? 'active' : ''}`} onClick={() => setDtBeams(!dtBeams)} title="Beams">
              ⚡
            </button>
            <button className={`dt-btn-mini ${dtLabels ? 'active' : ''}`} onClick={() => setDtLabels(!dtLabels)} title="Labels">
              🏷️
            </button>
            <button className={`dt-btn-mini ${dtRotate ? 'active' : ''}`} onClick={() => setDtRotate(!dtRotate)} title="Rotate">
              🔄
            </button>
          </div>
          
          <div className="bottom-divider" />

          <div className="time-slider-dock-wrap">
            <TimeSlider onTimeChange={handleTimeChange} isLoading={timeLoading} compact={true} />
          </div>
        </div>

        {/* Full View Toggle */}
        <button 
          className={`full-view-toggle ${isFullView ? 'active' : ''}`}
          onClick={() => setIsFullView(!isFullView)}
          title={isFullView ? "Exit Full View" : "Enter Full View"}
        >
          {isFullView ? "✕ Exit" : "⛶ Full View"}
        </button>
      </div>

      {/* Floating UI Overlays */}
      <div className="app-main">
        <Header
          group={group}
          onGroupChange={setGroup}
          satelliteCount={positions.length}
          lastUpdate={lastUpdate}
        />

        {/* Centered Tab Navigation */}
        <div className="dashboard-tabs-centered" style={{ opacity: isFullView ? 0 : 1 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`dashboard-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="floating-ui-layer" style={{ opacity: isFullView ? 0 : 1, pointerEvents: isFullView ? 'none' : 'auto' }}>
          {/* Left Column — Content changes based on active tab */}
          <div className="floating-left-widgets">
            {renderLeftPanel()}
          </div>

          {/* Right Column — Always visible */}
          <div className="floating-right-widgets">
            <button 
              className="time-btn resolve-btn" 
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

      {/* Traffic Manager AI — only shown as floating when NOT on AI tab */}
      {activeTab !== 'ai' && !isFullView && (
        <TrafficManagerAI
          satelliteContext={positions}
          onHighlightSatellites={(ids) => {
            setAiHighlightedIds(ids);
            setTimeout(() => setAiHighlightedIds([]), 12000);
          }}
        />
      )}

      {resolutions && (
        <NegotiationFeed resolutions={resolutions} onClose={() => setResolutions(null)} />
      )}
    </div>
  );
}
