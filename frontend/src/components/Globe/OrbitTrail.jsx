/**
 * OrbitTrail.jsx — Orbit path visualization as a fading line.
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { RISK_COLORS } from '../../constants';

export default function OrbitTrail({ points, riskLevel = 'NONE', colorOverride, isSimulated }) {
  const color = colorOverride || RISK_COLORS[riskLevel] || RISK_COLORS.NONE;

  const linePoints = useMemo(() => {
    if (!points || points.length < 2) return null;
    return points.map(p => [p.x, p.y, p.z]);
  }, [points]);

  if (!linePoints) return null;

  return (
    <Line
      points={linePoints}
      color={color}
      lineWidth={isSimulated ? 2.5 : 1}
      transparent
      opacity={isSimulated ? 0.9 : 0.4}
      depthWrite={false}
    />
  );
}
