/**
 * DensityField.jsx — Space Density Indicator
 * Visualizes crowded orbital zones with translucent shells at different altitude bands.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '../../constants';

export default function DensityField({ positions }) {
  // Group satellites by altitude bands (every 100km)
  const densityShells = useMemo(() => {
    if (!positions || positions.length === 0) return [];

    const bands = {};
    positions.forEach(p => {
      const alt = p.alt || 0;
      const band = Math.round(alt / 100) * 100; // Round to nearest 100km
      if (!bands[band]) bands[band] = 0;
      bands[band]++;
    });

    // Only show bands with significant density (2+ satellites)
    return Object.entries(bands)
      .filter(([_, count]) => count >= 2)
      .map(([altKm, count]) => ({
        radius: 1 + (parseInt(altKm) / EARTH_RADIUS_KM),
        count,
        intensity: Math.min(1, count / 10), // Normalize
      }));
  }, [positions]);

  if (densityShells.length === 0) return null;

  return (
    <group>
      {densityShells.map((shell, i) => (
        <mesh key={i}>
          <sphereGeometry args={[shell.radius, 32, 32]} />
          <meshBasicMaterial
            color="#6366f1"
            transparent
            opacity={shell.intensity * 0.04}
            depthWrite={false}
            side={THREE.DoubleSide}
            wireframe={false}
          />
        </mesh>
      ))}
    </group>
  );
}
