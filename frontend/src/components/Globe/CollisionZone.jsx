import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RISK_COLORS } from '../../constants';

export default function CollisionZone({ position, riskLevel, riskScore, distance }) {
  const meshRef = useRef();
  const innerRef = useRef();
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.NONE;
  
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

      {/* Core Node */}
      <mesh>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial 
          color={bloomColor}
          toneMapped={false} 
        />
      </mesh>
    </group>
  );
}
