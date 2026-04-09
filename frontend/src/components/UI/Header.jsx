import { SATELLITE_GROUPS } from '../../constants';

/**
 * Header.jsx — Glassmorphic top bar with branding, group selector, and status.
 */
export default function Header({ group, onGroupChange, satelliteCount, lastUpdate }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">FX</div>
        <div className="header-text">
          <div className="header-title">ORBIX</div>
          <div className="header-subtitle">Space Traffic Management</div>
        </div>
      </div>

      <div className="header-controls">
        <div className="group-selector">
          <select value={group} onChange={(e) => onGroupChange(e.target.value)}>
            {SATELLITE_GROUPS.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="header-status">
          <span className="status-dot"></span>
          <span>{satelliteCount || 0} satellites tracked</span>
        </div>

        {lastUpdate && (
          <div className="header-status" style={{ opacity: 0.5 }}>
            Updated: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        )}
      </div>
    </header>
  );
}
