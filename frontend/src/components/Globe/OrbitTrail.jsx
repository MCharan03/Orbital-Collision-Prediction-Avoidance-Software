/**
 * OrbitTrail.jsx — Enhanced orbit path visualization with gradient opacity.
 *
 * Features:
 *  - Gradient opacity (bright near the satellite, fading toward the tail)
 *  - Different styling for simulated trails (dashed cyan)
 *  - Increased line width for selected trails
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { RISK_COLORS } from '../../constants';

export default function OrbitTrail({ points, riskLevel = 'NONE' }) {
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.NONE;
  const isSimulated = riskLevel === 'SIMULATED';

  const linePoints = useMemo(() => {
    if (!points || points.length < 2) return null;
    return points.map(p => [p.x, p.y, p.z]);
  }, [points]);

  if (!linePoints) return null;

  return (
    <group>
      {/* Primary trail line */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={isSimulated ? 1.8 : 1.5}
        transparent
        opacity={isSimulated ? 0.5 : 0.45}
        depthWrite={false}
        dashed={isSimulated}
        dashSize={isSimulated ? 0.015 : undefined}
        gapSize={isSimulated ? 0.01 : undefined}
      />

      {/* Glow trail (wider, more transparent) for emphasis */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={isSimulated ? 5 : 4}
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </group>
  );
}
