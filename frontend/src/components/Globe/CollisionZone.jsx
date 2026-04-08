/**
 * CollisionZone.jsx — Enhanced collision zone with shockwave & ripple effects.
 *
 * Features:
 *  - Dual expanding ring system (original)
 *  - New: Hexagonal shield plane for high-risk zones
 *  - New: Concentric ripple rings expanding outward
 *  - Brighter bloom-compatible core
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RISK_COLORS } from '../../constants';

export default function CollisionZone({ position, riskLevel, riskScore, distance }) {
  const meshRef = useRef();
  const innerRef = useRef();
  const ripple1Ref = useRef();
  const ripple2Ref = useRef();
  const ripple3Ref = useRef();
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.NONE;
  const isHigh = riskLevel === 'HIGH';

  // Calculate bloom color simply by multiplying base color
  const bloomColor = useMemo(() => {
    const c = new THREE.Color(color);
    c.multiplyScalar(5.0); // Extremely bright for bloom
    return c;
  }, [color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    
    // Expanding rings
    const s1 = (t % 1.5) * 8;
    meshRef.current.scale.setScalar(s1);
    meshRef.current.material.opacity = Math.max(0, 1 - (t % 1.5) / 1.5) * 0.8;

    if (innerRef.current) {
      const s2 = ((t + 0.75) % 1.5) * 8;
      innerRef.current.scale.setScalar(s2);
      innerRef.current.material.opacity = Math.max(0, 1 - ((t + 0.75) % 1.5) / 1.5) * 0.8;
    }

    // Shockwave ripples (staggered)
    const ripples = [ripple1Ref, ripple2Ref, ripple3Ref];
    ripples.forEach((ref, i) => {
      if (!ref.current) return;
      const phase = (t + i * 0.6) % 2.0;
      const scale = phase * 12;
      ref.current.scale.setScalar(scale);
      ref.current.material.opacity = Math.max(0, 1 - phase / 2.0) * 0.35;
    });
  });

  if (!position) return null;

  return (
    <group position={position}>
      {/* Outer Ring */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.015, 32, 32]} />
        <meshBasicMaterial 
          color={bloomColor} 
          transparent 
          opacity={0.8}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Inner Ring */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.015, 32, 32]} />
        <meshBasicMaterial 
          color={bloomColor}
          transparent 
          opacity={0.8}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Shockwave Ripple Rings */}
      <mesh ref={ripple1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.012, 0.014, 32]} />
        <meshBasicMaterial
          color={bloomColor}
          toneMapped={false}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ripple2Ref} rotation={[0, 0, Math.PI / 3]}>
        <ringGeometry args={[0.012, 0.014, 32]} />
        <meshBasicMaterial
          color={bloomColor}
          toneMapped={false}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ripple3Ref} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[0.012, 0.014, 32]} />
        <meshBasicMaterial
          color={bloomColor}
          toneMapped={false}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core Node */}
      <mesh>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial 
          color={bloomColor}
          toneMapped={false} 
        />
      </mesh>

      {/* High-risk: extra hexagonal shield glow */}
      {isHigh && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.04, 6]} />
          <meshBasicMaterial
            color={bloomColor}
            toneMapped={false}
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
