/**
 * SatelliteLabel.jsx — Persistent floating 3D telemetry label for Digital Twin.
 *
 * Always-visible mini glassmorphic card for selected or high-risk satellites.
 * Shows name, altitude, velocity, and risk badge.
 */
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { RISK_COLORS } from '../../constants';

export default function SatelliteLabel({ satellite, isSelected, visible = true }) {
  if (!visible || !satellite) return null;

  const {
    name,
    norad_id,
    x, y, z,
    alt,
    vx, vy, vz,
    risk_level = 'LOW',
    risk_score = 0,
  } = satellite;

  // Only show for selected OR elevated risk
  const shouldShow = isSelected || risk_level === 'HIGH' || risk_level === 'MEDIUM';
  if (!shouldShow) return null;

  if (x === undefined || y === undefined || z === undefined) return null;

  const velocity = useMemo(() => {
    if (vx === undefined || vy === undefined || vz === undefined) return null;
    return Math.sqrt(vx * vx + vy * vy + vz * vz);
  }, [vx, vy, vz]);

  const color = RISK_COLORS[risk_level] || RISK_COLORS.NONE;
  const riskClass = risk_level?.toLowerCase() || 'low';

  return (
    <group position={[x, y, z]}>
      {/* Vertical tether line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0.06, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </line>

      {/* Floating label */}
      <Html
        position={[0, 0.07, 0]}
        distanceFactor={5}
        style={{ pointerEvents: 'none' }}
        center
      >
        <div className={`sat-3d-label ${isSelected ? 'selected' : ''}`}>
          <div className="sat-3d-label-header">
            <span className="sat-3d-label-name">{(name || '').substring(0, 18)}</span>
            <span className={`sat-3d-label-risk ${riskClass}`}>{risk_level}</span>
          </div>
          <div className="sat-3d-label-metrics">
            {alt !== undefined && (
              <div className="sat-3d-label-metric">
                <span className="label">ALT</span>
                <span className="value">{alt.toFixed(0)} km</span>
              </div>
            )}
            {velocity !== null && (
              <div className="sat-3d-label-metric">
                <span className="label">VEL</span>
                <span className="value">{velocity.toFixed(2)} km/s</span>
              </div>
            )}
            {risk_score > 0 && (
              <div className="sat-3d-label-metric">
                <span className="label">RISK</span>
                <span className="value" style={{ color }}>{risk_score}/100</span>
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
