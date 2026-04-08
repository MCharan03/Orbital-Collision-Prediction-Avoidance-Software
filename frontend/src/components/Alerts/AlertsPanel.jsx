import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * AlertsPanel.jsx — Glassmorphic collision alert list sorted by risk.
 */
export default function AlertsPanel({ collisions, onAlertClick }) {
  if (!collisions || collisions.length === 0) {
    return (
      <div className="sidebar-section">
        <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} /> Collision Alerts
        </div>
        <div className="empty-state">
          <div className="empty-state-icon"><ShieldCheck size={24} /></div>
          <div className="empty-state-text">ALL CLEAR</div>
        </div>
      </div>
    );
  }

  const formatDistance = (km) => {
    if (km < 1) return `${(km * 1000).toFixed(0)} m`;
    if (km < 100) return `${km.toFixed(2)} km`;
    return `${km.toFixed(0)} km`;
  };

  const formatVelocity = (v) => `${v.toFixed(2)}`;

  const formatTCA = (isoString) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = d - now;
      const diffH = Math.floor(diffMs / 3600000);
      const diffM = Math.floor((diffMs % 3600000) / 60000);
      if (diffMs < 0) return 'Past';
      if (diffH > 0) return `in ${diffH}h ${diffM}m`;
      return `in ${diffM}m`;
    } catch {
      return 'N/A';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 16 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } }
  };

  return (
    <div className="alerts-section">
      <div className="sidebar-section-title alerts-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldAlert size={16} /> COLLISION ALERTS ({collisions.length})
      </div>
      
      <motion.div 
        className="alerts-list"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {collisions.map((c, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileTap={{ scale: 0.98 }}
            className={`alert-card ${c.risk_level?.toLowerCase()}`}
            onClick={() => onAlertClick?.(c)}
          >
            <div className="alert-header">
              <div className="alert-pair">
                {(c.sat1_name || '').substring(0, 15)} <span>↔</span> {(c.sat2_name || '').substring(0, 15)}
                
                {c.ml_risk && c.ml_risk.level !== c.physics_risk?.level && (
                  <span className="ai-insight-badge" title="AI prediction diverges from standard physics model">
                    ✨ AI
                  </span>
                )}
              </div>
              <div className="alert-badge-row">
                <div className={`risk-badge ${c.physics_risk?.level?.toLowerCase() || 'low'}`} title="SGP4 Physics Risk">
                  PHY {c.physics_risk?.score || c.risk_score}
                </div>
                {c.ml_risk && (
                  <div className={`risk-badge ml-badge ${c.ml_risk.level?.toLowerCase()}`} title="AI Risk">
                    AI {c.ml_risk.score}
                  </div>
                )}
                {c.ml_risk?.confidence !== undefined && (
                  <div className="conf-mini">
                    {(c.ml_risk.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>

            <div className="alert-metrics">
              <div className="metric-group">
                <div className="metric-label">Min Distance</div>
                <div className={`metric-value ${c.min_distance_km < 1 ? 'critical' : 'warning'}`}>
                  {formatDistance(c.min_distance_km)}
                </div>
              </div>
              <div className="metric-group">
                <div className="metric-label">Rel. Velocity</div>
                <div className="metric-value">
                  {formatVelocity(c.relative_velocity_km_s)} <span className="metric-unit">km/s</span>
                </div>
              </div>
              <div className="metric-group" style={{ gridColumn: 'span 2' }}>
                <div className="metric-label">Orbital Speeds (Target 1 / Target 2)</div>
                <div className="metric-value" style={{ fontSize: '11px', display: 'flex', gap: '8px' }}>
                  <span>
                    {c.sat1_position?.vx ? Math.sqrt(c.sat1_position.vx**2 + c.sat1_position.vy**2 + c.sat1_position.vz**2).toFixed(2) : '-'} <span className="metric-unit">km/s</span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>/</span>
                  <span>
                    {c.sat2_position?.vx ? Math.sqrt(c.sat2_position.vx**2 + c.sat2_position.vy**2 + c.sat2_position.vz**2).toFixed(2) : '-'} <span className="metric-unit">km/s</span>
                  </span>
                </div>
              </div>
              <div className="metric-group">
                <div className="metric-label">TCA</div>
                <div className="metric-value">
                  {formatTCA(c.time_of_closest_approach)}
                </div>
              </div>
              <div className="metric-group">
                <div className="metric-label">Final Risk</div>
                <div className="metric-value final-risk">
                  {c.final_risk || c.risk_level}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
