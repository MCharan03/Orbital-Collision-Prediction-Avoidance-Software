/**
 * OrbitalGrid.jsx — Reference grid for the 3D Digital Twin.
 *
 * Renders:
 *  - Equatorial ring (bright cyan)
 *  - Latitude lines every 30° (translucent)
 *  - Longitude lines every 30° (translucent)
 *  - Altitude reference shells at LEO (400km) and MEO (2000km)
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '../../constants';

function createCirclePoints(radius, segments = 128) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return pts;
}

function LatitudeRing({ latDeg, radius = 1.002, color = '#ffffff', opacity = 0.08 }) {
  const geometry = useMemo(() => {
    const latRad = (latDeg * Math.PI) / 180;
    const ringRadius = radius * Math.cos(latRad);
    const y = radius * Math.sin(latRad);
    const points = createCirclePoints(ringRadius);
    points.forEach(p => { p.y = y; });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [latDeg, radius]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </line>
  );
}

function LongitudeRing({ lonDeg, radius = 1.002, color = '#ffffff', opacity = 0.06 }) {
  const geometry = useMemo(() => {
    const lonRad = (lonDeg * Math.PI) / 180;
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const latRad = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        radius * Math.cos(latRad) * Math.cos(lonRad),
        radius * Math.sin(latRad),
        radius * Math.cos(latRad) * Math.sin(lonRad)
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [lonDeg, radius]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </line>
  );
}

function AltitudeShell({ altitudeKm, color = '#6366f1', opacity = 0.04 }) {
  const radius = 1 + altitudeKm / EARTH_RADIUS_KM;
  const geometry = useMemo(() => {
    const pts = createCirclePoints(radius);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  return (
    <group>
      {/* Equatorial ring at this altitude */}
      <line geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={opacity * 3} depthWrite={false} />
      </line>
      {/* Thin wireframe shell */}
      <mesh>
        <sphereGeometry args={[radius, 32, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          wireframe
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function OrbitalGrid({ visible = true }) {
  if (!visible) return null;

  const latitudes = [-60, -30, 30, 60];
  const longitudes = [0, 30, 60, 90, 120, 150];

  return (
    <group>
      {/* ── Equatorial Ring (bright) ────────────── */}
      <LatitudeRing latDeg={0} color="#06b6d4" opacity={0.18} />

      {/* ── Latitude Lines ─────────────────────── */}
      {latitudes.map(lat => (
        <LatitudeRing key={`lat-${lat}`} latDeg={lat} />
      ))}

      {/* ── Longitude Lines ────────────────────── */}
      {longitudes.map(lon => (
        <LongitudeRing key={`lon-${lon}`} lonDeg={lon} />
      ))}

      {/* ── Altitude Reference Shells ──────────── */}
      <AltitudeShell altitudeKm={400} color="#06b6d4" opacity={0.025} />
      <AltitudeShell altitudeKm={2000} color="#a855f7" opacity={0.015} />
    </group>
  );
}
