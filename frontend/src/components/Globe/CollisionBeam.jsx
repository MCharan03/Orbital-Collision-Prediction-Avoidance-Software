/**
 * CollisionBeam.jsx — Animated beam connecting two satellites in a collision pair.
 *
 * Renders a pulsing line between sat1 and sat2 with a midpoint distance label.
 * Color matches risk level. Used in Digital Twin mode for interactive collision viz.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { RISK_COLORS } from '../../constants';

export default function CollisionBeam({ collision, visible = true }) {
  const groupRef = useRef();
  const opacityRef = useRef(0.6);

  const {
    sat1_position: p1,
    sat2_position: p2,
    risk_level,
    min_distance_km,
    sat1_name,
    sat2_name,
  } = collision;

  const color = RISK_COLORS[risk_level] || RISK_COLORS.NONE;

  const linePoints = useMemo(() => {
    if (!p1 || !p2) return null;
    return [
      [p1.x, p1.y, p1.z],
      [p2.x, p2.y, p2.z],
    ];
  }, [p1, p2]);

  const midpoint = useMemo(() => {
    if (!p1 || !p2) return null;
    return [
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2,
      (p1.z + p2.z) / 2,
    ];
  }, [p1, p2]);

  const formatDist = (km) => {
    if (km < 1) return `${(km * 1000).toFixed(0)}m`;
    if (km < 100) return `${km.toFixed(1)}km`;
    return `${km.toFixed(0)}km`;
  };

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    // Pulsing opacity
    opacityRef.current = 0.35 + Math.sin(t * 3) * 0.25;
  });

  if (!visible || !linePoints || !midpoint) return null;

  const isHigh = risk_level === 'HIGH';
  const isMedium = risk_level === 'MEDIUM';

  return (
    <group ref={groupRef}>
      {/* Beam line */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={isHigh ? 2.5 : isMedium ? 1.8 : 1.2}
        transparent
        opacity={0.5}
        depthWrite={false}
        dashed
        dashSize={0.02}
        dashOffset={0}
        gapSize={0.01}
      />

      {/* Secondary glow line (wider, more transparent) */}
      {(isHigh || isMedium) && (
        <Line
          points={linePoints}
          color={color}
          lineWidth={isHigh ? 6 : 4}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      )}

      {/* Glowing midpoint sphere */}
      <group position={midpoint}>
        <mesh>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshBasicMaterial
            color={new THREE.Color(color).multiplyScalar(3)}
            toneMapped={false}
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}
