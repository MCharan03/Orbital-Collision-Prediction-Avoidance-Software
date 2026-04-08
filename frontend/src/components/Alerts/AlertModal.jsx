import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { simulateManeuver } from '../../utils/api';

export default function AlertModal({ collision, group = 'stations', onClose }) {
  const [simDeltaH, setSimDeltaH] = useState(5.0);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

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

  const handleSimulate = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const data = await simulateManeuver(
        collision.sat1_norad_id,
        collision.sat2_norad_id,
        simDeltaH,
        group
      );
      setSimResult(data);
    } catch (err) {
      console.error("Simulation error", err);
      setSimResult({ error: "Failed to run simulation." });
    } finally {
      setSimLoading(false);
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

          {/* Orbital Parameters Section */}
          <div className="modal-explainability" style={{ marginTop: '24px' }}>
            <div className="modal-section-label" style={{ color: '#a855f7' }}>
              Orbital Parameters & Telemetry
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              {/* Target 1 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>{sat1_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(226, 232, 240, 0.8)', lineHeight: '1.6' }}>
                  <div><strong>Alt:</strong> {collision.sat1_position?.alt?.toFixed(2)} km</div>
                  <div><strong>Lat/Lon:</strong> {collision.sat1_position?.lat?.toFixed(4)}°, {collision.sat1_position?.lon?.toFixed(4)}°</div>
                  <div><strong>Vel (x,y,z):</strong> {collision.sat1_position?.vx?.toFixed(2)}, {collision.sat1_position?.vy?.toFixed(2)}, {collision.sat1_position?.vz?.toFixed(2)} km/s</div>
                  <div><strong>Pos (x,y,z):</strong> {collision.sat1_position?.x?.toFixed(2)}, {collision.sat1_position?.y?.toFixed(2)}, {collision.sat1_position?.z?.toFixed(2)}</div>
                </div>
              </div>
              
               {/* Target 2 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>{sat2_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(226, 232, 240, 0.8)', lineHeight: '1.6' }}>
                  <div><strong>Alt:</strong> {collision.sat2_position?.alt?.toFixed(2)} km</div>
                  <div><strong>Lat/Lon:</strong> {collision.sat2_position?.lat?.toFixed(4)}°, {collision.sat2_position?.lon?.toFixed(4)}°</div>
                  <div><strong>Vel (x,y,z):</strong> {collision.sat2_position?.vx?.toFixed(2)}, {collision.sat2_position?.vy?.toFixed(2)}, {collision.sat2_position?.vz?.toFixed(2)} km/s</div>
                  <div><strong>Pos (x,y,z):</strong> {collision.sat2_position?.x?.toFixed(2)}, {collision.sat2_position?.y?.toFixed(2)}, {collision.sat2_position?.z?.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Maneuver Simulation */}
          <div className="modal-explainability" style={{ marginTop: '24px' }}>
            <div className="modal-section-label" style={{ color: '#22d3ee' }}>
              Simulate Avoidance Maneuver
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
              <input 
                type="range" 
                min="-20" 
                max="20" 
                step="1" 
                value={simDeltaH} 
                onChange={e => setSimDeltaH(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#22d3ee' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', minWidth: '60px', color: '#e2e8f0' }}>
                {simDeltaH > 0 ? '+' : ''}{simDeltaH} km
              </span>
              <button 
                className="time-btn" 
                style={{ background: 'rgba(34, 211, 238, 0.1)', borderColor: '#22d3ee', color: '#22d3ee', whiteSpace: 'nowrap' }}
                onClick={handleSimulate}
                disabled={simLoading}
              >
                {simLoading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>

            {simResult && !simResult.error && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px', color: '#22c55e', fontWeight: 'bold' }}>Simulation Successful</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#e2e8f0' }}>
                  <span>Original Risk: <strong>{collision.risk_score}</strong> ({collision.risk_level})</span>
                  <span>➜</span>
                  <span>New Risk: <strong>{simResult.new_risk_score}</strong> ({simResult.new_risk_level})</span>
                </div>
                {simResult.new_distance_km !== null && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(226, 232, 240, 0.7)' }}>
                    New Min Distance: {simResult.new_distance_km < 1 ? (simResult.new_distance_km*1000).toFixed(0) + ' m' : simResult.new_distance_km.toFixed(2) + ' km'}
                  </div>
                )}
              </div>
            )}
            
            {simResult?.error && (
              <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>
                {simResult.error}
              </div>
            )}
          </div>

        </div>
      </div>
    </AnimatePresence>
  );
}
