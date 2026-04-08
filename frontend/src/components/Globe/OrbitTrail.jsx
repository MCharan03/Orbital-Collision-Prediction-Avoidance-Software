/**
 * OrbitTrail.jsx — Orbit path visualization as a fading line.
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { RISK_COLORS } from '../../constants';

export default function OrbitTrail({ points, riskLevel = 'NONE' }) {
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.NONE;

  const linePoints = useMemo(() => {
    if (!points || points.length < 2) return null;
    return points.map(p => [p.x, p.y, p.z]);
  }, [points]);

  if (!linePoints) return null;

  return (
    <Line
      points={linePoints}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.4}
      depthWrite={false}
    />
  );
}
