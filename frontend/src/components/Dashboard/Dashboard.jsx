import { useState, useEffect, useCallback, Component } from 'react';
import Scene from '../Globe/Scene';
import Header from '../UI/Header';
import TimeSlider from '../UI/TimeSlider';
import Sidebar from '../Sidebar/Sidebar';
import StatsPanel from './StatsPanel';
import AlertsPanel from '../Alerts/AlertsPanel';
import AlertModal from '../Alerts/AlertModal';
import { fetchDashboard, fetchTrail } from '../../utils/api';

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

  useEffect(() => {
    setLoading(true);
    setSelectedSat(null);
    setTrail(null);
    setDeviationTrail(null);
    loadData();
  }, [group, loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Satellite Selection ────────────────────
  const handleSelectSatellite = useCallback(async (sat) => {
    setSelectedSat(sat);
    // Fetch orbit trail for selected satellite
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
    loadData(newTime.toISOString());
  }, [loadData]);

  // ── Alert Click ────────────────────────────
  const handleAlertClick = useCallback((collision) => {
    // Find sat1 in positions and select it
    const sat = positions.find(p => p.norad_id === collision.sat1_norad_id);
    if (sat) handleSelectSatellite(sat);
    setModalAlert(collision);
  }, [positions, handleSelectSatellite]);

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
            deviationTrail={deviationTrail}
          />
        </ErrorBoundary>

        {/* Globe overlay badges */}
        <div className="globe-overlay" style={{ opacity: isFullView ? 0 : 1, transition: 'opacity 0.4s', pointerEvents: isFullView ? 'none' : 'auto' }}>
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
          {selectedSat && (
            <div className="overlay-badge" style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}>
              📡 <span className="count">{selectedSat.name}</span>
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>
                Alt: {selectedSat.alt?.toFixed(0)} km
              </span>
            </div>
          )}
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
            />
          </div>

          {/* Right Column Widgets */}
          <div className="floating-right-widgets">
            <AlertsPanel
              collisions={collisions}
              onAlertClick={handleAlertClick}
            />

            <Sidebar
              positions={positions}
              selectedSatId={selectedSat?.norad_id}
              onSelectSatellite={handleSelectSatellite}
            />
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
          }} 
          onSimulationComplete={setDeviationTrail}
        />
      )}
    </div>
  );
}