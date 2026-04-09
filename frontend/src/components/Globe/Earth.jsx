import { useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// Single lightweight texture
const EARTH_DAY_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

/**
 * Earth.jsx — Lightweight 3D Earth globe.
 * 
 * ECEF Fixed: Earth does NOT rotate — satellite positions from backend
 * are in ECEF coordinates which already account for Earth rotation.
 */
export default function Earth() {
  const earthRef = useRef();

  let dayMap;
  try {
    dayMap = useLoader(THREE.TextureLoader, EARTH_DAY_URL);
    dayMap.colorSpace = THREE.SRGBColorSpace;
  } catch (e) {
    // Texture failed to load — render a colored sphere fallback
    return (
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#1a4a7a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    );
  }

  return (
    <group>
      {/* Earth surface (STATIONARY for ECEF alignment) */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Simple atmosphere glow — just a slightly larger transparent sphere */}
      <mesh>
        <sphereGeometry args={[1.025, 32, 32]} />
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
