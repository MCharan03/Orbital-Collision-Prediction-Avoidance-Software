import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudLightning, Radio, Shield, AlertTriangle, 
  ChevronDown, ChevronUp, Zap, Activity, Sun
} from 'lucide-react';
import { WEATHER_COLORS, NETWORK_STATUS_COLORS, RECOMMENDATION_COLORS } from '../../constants';

/**
 * ASWANPanel.jsx — Main ASWAN Intelligence Panel
 * 
 * Sections:
 *  - Active Weather Events with countdown
 *  - Network Status (before vs after risk)
 *  - Top Recommendations
 */
export default function ASWANPanel({ weatherData, networkData }) {
  const [expanded, setExpanded] = useState(true);

  if (!weatherData && !networkData) return null;

  const events = weatherData?.events || [];
  const threatLevel = weatherData?.overall_threat_level || 'NOMINAL';
  const affectedCount = weatherData?.affected_count || 0;

  const networkStatus = networkData?.network_status || 'NOMINAL';
  const riskBefore = networkData?.risk_before || 0;
  const riskAfter = networkData?.risk_after || 0;
  const recommendations = networkData?.recommendations || [];

  const threatColor = WEATHER_COLORS[threatLevel] || WEATHER_COLORS.NOMINAL;
  const statusColor = NETWORK_STATUS_COLORS[networkStatus] || NETWORK_STATUS_COLORS.NOMINAL;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 16 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } }
  };

  return (
    <motion.div
      className="aswan-panel glass-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
    >
      {/* Panel Header */}
      <div className="aswan-header" onClick={() => setExpanded(!expanded)}>
        <div className="aswan-title-row">
          <CloudLightning size={16} color={threatColor} />
          <span className="aswan-title">ASWAN</span>
          <span className="aswan-subtitle">Space Weather Network</span>
        </div>
        <div className="aswan-header-right">
          <span className="aswan-threat-badge" style={{ 
            background: `${threatColor}15`, 
            color: threatColor,
            borderColor: `${threatColor}40`
          }}>
            {threatLevel}
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="aswan-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Weather Events */}
            {events.length > 0 && (
              <div className="aswan-section">
                <div className="aswan-section-label">
                  <Sun size={12} /> ACTIVE EVENTS ({events.length})
                </div>
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  {events.slice(0, 4).map((event, i) => (
                    <motion.div
                      key={event.id || i}
                      variants={itemVariants}
                      className={`aswan-event-card ${event.type === 'SOLAR_STORM' ? 'solar' : 'meteor'}`}
                    >
                      <div className="aswan-event-header">
                        <span className="aswan-event-icon">
                          {event.type === 'SOLAR_STORM' ? <Zap size={14} /> : <Activity size={14} />}
                        </span>
                        <span className="aswan-event-name">{event.name}</span>
                        <span className={`aswan-status-pill ${event.status?.toLowerCase()}`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="aswan-event-metrics">
                        {event.kp_index && (
                          <span className="aswan-metric">
                            <span className="aswan-metric-label">Kp</span>
                            <span className="aswan-metric-value">{event.kp_index}</span>
                          </span>
                        )}
                        {event.zhr && (
                          <span className="aswan-metric">
                            <span className="aswan-metric-label">ZHR</span>
                            <span className="aswan-metric-value">{event.zhr}</span>
                          </span>
                        )}
                        <span className="aswan-metric">
                          <span className="aswan-metric-label">Intensity</span>
                          <span className="aswan-metric-value">{Math.round(event.intensity * 100)}%</span>
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Network Before vs After */}
            {networkData && (
              <div className="aswan-section">
                <div className="aswan-section-label">
                  <Radio size={12} /> NETWORK STATUS
                </div>
                <div className="aswan-network-comparison">
                  <div className="aswan-risk-gauge">
                    <div className="aswan-gauge-label">Without ASWAN</div>
                    <div className="aswan-gauge-track">
                      <motion.div
                        className="aswan-gauge-fill danger"
                        initial={{ width: 0 }}
                        animate={{ width: `${riskBefore}%` }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="aswan-gauge-value" style={{ color: '#ff6b6b' }}>{riskBefore}%</span>
                  </div>
                  <div className="aswan-risk-gauge">
                    <div className="aswan-gauge-label">With ASWAN</div>
                    <div className="aswan-gauge-track">
                      <motion.div
                        className="aswan-gauge-fill safe"
                        initial={{ width: 0 }}
                        animate={{ width: `${riskAfter}%` }}
                        transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="aswan-gauge-value" style={{ color: '#22c55e' }}>{riskAfter}%</span>
                  </div>
                  <div className="aswan-reduction-badge">
                    <Shield size={12} />
                    <span>{riskBefore - riskAfter}% risk reduction</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Recommendations */}
            {recommendations.length > 0 && (
              <div className="aswan-section">
                <div className="aswan-section-label">
                  <AlertTriangle size={12} /> RECOMMENDATIONS ({recommendations.length})
                </div>
                <div className="aswan-recommendations">
                  {recommendations.slice(0, 4).map((rec, i) => (
                    <div key={i} className={`aswan-rec-card ${rec.priority?.toLowerCase()}`}>
                      <div className="aswan-rec-header">
                        <span className="aswan-rec-sat">{rec.satellite}</span>
                        <span className="aswan-rec-priority" style={{
                          color: RECOMMENDATION_COLORS[rec.priority],
                          borderColor: `${RECOMMENDATION_COLORS[rec.priority]}40`,
                          background: `${RECOMMENDATION_COLORS[rec.priority]}10`,
                        }}>
                          {rec.priority}
                        </span>
                      </div>
                      <div className="aswan-rec-action">
                        {rec.action?.replace(/_/g, ' ')}
                      </div>
                      <div className="aswan-rec-detail">{rec.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Count Footer */}
            <div className="aswan-footer">
              <span>{affectedCount} satellites affected</span>
              <span style={{ color: statusColor }}>{networkStatus}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
