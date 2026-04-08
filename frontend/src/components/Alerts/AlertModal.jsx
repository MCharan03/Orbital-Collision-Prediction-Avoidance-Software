import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function AlertModal({ collision, onClose, onSimulateManeuver }) {
  const [maneuvers, setManeuvers] = useState(null);
  const [loadingManeuvers, setLoadingManeuvers] = useState(false);

  useEffect(() => {
    if (!collision) return;
    let isMounted = true;
    
    const fetchManeuvers = async () => {
      try {
        setLoadingManeuvers(true);
        const res = await axios.post('http://localhost:5000/api/maneuvers/recommend', {
          sat1_id: collision.sat1_norad_id,
          sat2_id: collision.sat2_norad_id,
          tca: collision.time_of_closest_approach,
          original_min_distance: collision.min_distance_km
        });
        if (isMounted && res.data.status === 'success') {
          setManeuvers(res.data.recommendations);
        }
      } catch (e) {
        console.error("Maneuver fetch error", e);
      } finally {
        if (isMounted) setLoadingManeuvers(false);
      }
    };
    
    fetchManeuvers();
    return () => { isMounted = false; };
  }, [collision]);

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

          {/* Maneuver Recommendations */}
          <div className="modal-explainability" style={{ marginTop: 24, padding: 0, background: 'transparent', border: 'none' }}>
            <div className="modal-section-label" style={{ marginBottom: 12 }}>
              <span style={{ color: '#06b6d4' }}>⚡</span> AUTO-AVOIDANCE MANEUVERS
            </div>
            {loadingManeuvers ? (
               <div style={{ color: 'var(--color-ai)', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                 <div className="loader-orbit" style={{ width: 16, height: 16, border: '2px solid rgba(168,85,247,0.3)', borderTopColor: '#a855f7' }}></div> 
                 Computing Optimal Burn Windows...
               </div>
            ) : maneuvers && maneuvers.length > 0 ? (
               <div className="maneuver-list">
                 {maneuvers.map((m, idx) => (
                   <div key={idx} className={`maneuver-card ${idx === 0 ? 'best' : ''}`}>
                     {idx === 0 && <div className="maneuver-badge">OPTIMAL</div>}
                     <div className="maneuver-header">
                       <span style={{ fontWeight: 700, color: '#e2e8f0' }}>T-{m.window_minutes_before_tca}m</span>
                       <span style={{ color: 'var(--text-muted)' }}>|</span>
                       <span style={{ color: m.burn_direction === 'prograde' ? '#10b981' : '#f59e0b' }}>{m.burn_direction.toUpperCase()}</span>
                       <span style={{ color: 'var(--text-muted)' }}>|</span>
                       <span style={{ color: '#e2e8f0' }}>{m.delta_v_m_s} m/s</span>
                     </div>

                     <div className="maneuver-metrics">
                        <div className="maneuver-metric-col">
                           <div className="mm-label">Avoidance</div>
                           <div className="mm-value">
                              <div className="mm-bar-bg"><div className="mm-bar-fill" style={{ width: `${m.risk_reduction}%`, background: '#10b981' }}/></div>
                              <span style={{ color: '#10b981' }}>{m.risk_reduction}%</span>
                           </div>
                        </div>
                        <div className="maneuver-metric-col">
                           <div className="mm-label">Fuel Cost</div>
                           <div className="mm-value">
                              <div className="mm-bar-bg"><div className="mm-bar-fill" style={{ width: `${Math.min(100, m.fuel_cost*40)}%`, background: '#ef4444' }}/></div>
                              <span style={{ color: '#ef4444' }}>{m.fuel_cost.toFixed(1)}</span>
                           </div>
                        </div>
                        <div className="maneuver-metric-col">
                           <div className="mm-label">Flexibility</div>
                           <div className="mm-value">
                              <div className="mm-bar-bg"><div className="mm-bar-fill" style={{ width: `${m.timing_score}%`, background: '#3b82f6' }}/></div>
                              <span style={{ color: '#3b82f6' }}>{m.window_minutes_before_tca}m</span>
                           </div>
                        </div>
                     </div>

                     <div className="maneuver-reason">
                       {m.recommendation}
                     </div>

                     <button className="time-btn" style={{ width: '100%', marginTop: 12, padding: '8px 0', fontSize: 10, background: idx===0 ? 'rgba(6,182,212,0.1)' : 'transparent' }} onClick={() => {
                        if (onSimulateManeuver) {
                           onSimulateManeuver(m, collision);
                           onClose();
                        }
                     }}>
                       VISUALIZE TRAJECTORY ⟶
                     </button>
                   </div>
                 ))}
               </div>
            ) : (
               <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>No optimized maneuvers found within limits.</div>
            )}
          </div>

        </div>
      </div>
    </AnimatePresence>
  );
}
