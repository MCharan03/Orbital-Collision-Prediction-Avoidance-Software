import React from 'react';
import { AnimatePresence } from 'framer-motion';

export default function AlertModal({ collision, onClose }) {
  if (!collision) return null;

  const {
    sat1_name, sat2_name,
    physics_risk, ml_risk,
    min_distance_km, relative_velocity_km_s, time_of_closest_approach
  } = collision;

  const confidence = ml_risk?.confidence || 0;
  const confidencePercent = Math.round(confidence * 100);
  
  let confColorClass = 'low';
  if (confidencePercent > 80) confColorClass = 'high';
  else if (confidencePercent > 40) confColorClass = 'med';

  const formatTCA = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          
          {/* Title */}
          <div className="modal-header-section">
            <h2 className="modal-title">Collision Intelligence Report</h2>
            <div className="modal-subtitle">
              Target: {sat1_name} ↔ {sat2_name}
            </div>
          </div>

          {/* Dual Model Cards */}
          <div className="modal-dual-grid">
            <div className="modal-model-card">
              <div className="modal-model-label">Physics Model (SGP4)</div>
              <div className="modal-model-value">
                {physics_risk?.level || collision.risk_level || 'UNKNOWN'}
              </div>
              <div className="modal-model-score">Score: {physics_risk?.score || collision.risk_score || 0}/100</div>
            </div>

            <div className="modal-model-card ai">
              <div className="modal-model-label ai">AI Prediction Model</div>
              <div className="modal-model-value ai">
                {ml_risk?.level || 'UNKNOWN'}
              </div>
              <div className="modal-model-score ai">Score: {ml_risk?.score || 0}/100</div>
            </div>
          </div>

          {/* Disagreement Badge */}
          {ml_risk?.disagreement && (
            <div className={`disagreement-badge ${ml_risk.disagreement.includes('Low') ? 'low-conf' : ''}`}>
              ⚠ {ml_risk.disagreement}
            </div>
          )}

          {/* AI Confidence Meter */}
          {ml_risk && (
            <div className="confidence-container">
              <div className="confidence-header">
                <span>AI Confidence Matrix</span>
                <span className="confidence-value">{confidencePercent}%</span>
              </div>
              <div className="confidence-track">
                <div 
                  className={`confidence-fill ${confColorClass}`} 
                  style={{ width: `${confidencePercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Explainability */}
          {ml_risk?.reason && ml_risk.reason.length > 0 && (
            <div className="modal-explainability">
              <div className="modal-section-label">
                Explainability — Why AI Predicted This
              </div>
              <ul className="ai-reason-list">
                {ml_risk.reason.map((r, i) => (
                  <li key={i} className="ai-reason-item">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Metrics */}
          <div className="modal-bottom-metrics">
             <div className="modal-metric">
                <div className="modal-metric-label">Min Distance</div>
                <div className="modal-metric-value">{min_distance_km < 1 ? (min_distance_km*1000).toFixed(0) + ' m' : min_distance_km.toFixed(2) + ' km'}</div>
             </div>
             <div className="modal-metric">
                <div className="modal-metric-label">Relative Vel.</div>
                <div className="modal-metric-value">{relative_velocity_km_s.toFixed(2)} km/s</div>
             </div>
             <div className="modal-metric">
                <div className="modal-metric-label">TCA</div>
                <div className="modal-metric-value small">{formatTCA(time_of_closest_approach)}</div>
             </div>
          </div>

        </div>
      </div>
    </AnimatePresence>
  );
}
