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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeLoading, setTimeLoading] = useState(false);

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

  // Initial load + group change
  useEffect(() => {
    setLoading(true);
    setSelectedSat(null);
    setTrail(null);
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
      <Header
        group={group}
        onGroupChange={setGroup}
        satelliteCount={positions.length}
        lastUpdate={lastUpdate}
      />

      <div className="app-main">
        {/* 3D Globe */}
        <div className="globe-container">
          <ErrorBoundary>
            <Scene
              positions={positions}
              collisions={collisions}
              selectedSatId={selectedSat?.norad_id}
              onSelectSatellite={handleSelectSatellite}
              trail={trail}
            />
          </ErrorBoundary>

          {/* Globe overlay badges */}
          <div className="globe-overlay">
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

          {/* Time simulation slider */}
          <TimeSlider onTimeChange={handleTimeChange} isLoading={timeLoading} />
        </div>

        {/* Right Sidebar */}
        <div className="sidebar">
          <StatsPanel
            satelliteCount={positions.length}
            collisionSummary={collisionSummary}
          />

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

      {modalAlert && (
        <AlertModal collision={modalAlert} onClose={() => setModalAlert(null)} />
      )}
    </div>
  );
}
