import { SATELLITE_GROUPS } from '../../constants';

/**
 * Header.jsx — Glassmorphic top bar with branding, group selector, and status.
 */
export default function Header({ group, onGroupChange, satelliteCount, lastUpdate }) {
  return (
    <header className="header">
      <div className="header-brand" style={{ flex: 1 }}>
        <div className="header-logo">FX</div>
        <div className="header-text">
          <div className="header-title">ORBIX</div>
          <div className="header-subtitle">Space Traffic Management</div>
        </div>
      </div>

      <div className="header-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10, 15, 30, 0.6)', backdropFilter: 'blur(20px)' }}>
          <button style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px 20px', borderRadius: '24px', color: '#fff', background: 'linear-gradient(90deg, rgba(89, 137, 204, 0.2), rgba(78, 133, 191, 0.2))', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ marginRight: '8px', fontSize: '14px' }}>🌐</span> Dashboard
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px 20px', borderRadius: '24px', color: 'rgba(255,255,255,0.5)', background: 'transparent', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} onClick={() => alert('Intelligence Feed coming soon')}>
            <span style={{ marginRight: '8px', fontSize: '14px' }}>📡</span> Intelligence Feed
          </button>
        </div>
      </div>

      <div className="header-controls" style={{ flex: 1, justifyContent: 'flex-end' }}>
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
