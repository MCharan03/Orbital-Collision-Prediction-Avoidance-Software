/**
 * CollisionZone.jsx — Lightweight collision zone indicator.
 * Simplified to 2 meshes (core + ring) to prevent WebGL overload.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RISK_COLORS } from '../../constants';

export default function CollisionZone({ position, riskLevel }) {
  const ringRef = useRef();
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.NONE;

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime;
    const s = (t % 2.0) * 6;
    ringRef.current.scale.setScalar(s);
    ringRef.current.material.opacity = Math.max(0, 1 - (t % 2.0) / 2.0) * 0.5;
  });

  if (!position) return null;

  return (
    <group position={position}>
      {/* Expanding ring */}
      <mesh ref={ringRef}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core dot */}
      <mesh>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
