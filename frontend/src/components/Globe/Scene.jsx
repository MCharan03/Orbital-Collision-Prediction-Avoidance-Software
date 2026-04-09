import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { easing } from 'maath';

import Earth from './Earth';
import Satellite from './Satellite';
import CollisionZone from './CollisionZone';
import OrbitTrail from './OrbitTrail';
import DensityField from './DensityField';
import DebrisField from './DebrisField';

/**
 * CameraRig — smooth focus on selected satellites
 */
function CameraRig({ selectedSatId, positions }) {
  const focusTarget = useMemo(() => {
    if (!selectedSatId) return null;
    const sat = positions?.find(p => p.norad_id === selectedSatId);
    if (sat && !isNaN(sat.x) && !isNaN(sat.y) && !isNaN(sat.z)) {
        return new THREE.Vector3(sat.x, sat.y, sat.z);
    }
    return null;
  }, [selectedSatId, positions]);

  useFrame((state, delta) => {
    if (focusTarget) {
      easing.damp3(
        state.camera.position,
        [focusTarget.x * 2, focusTarget.y * 2 + 0.5, focusTarget.z * 2],
        0.4,
        delta
      );
      state.camera.lookAt(0, 0, 0);
    }
  });

  return (
    <OrbitControls
      enablePan={false}
      minDistance={1.5}
      maxDistance={8}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      enabled={!focusTarget}
    />
  );
}

export default function Scene({ positions, collisions, selectedSatId, onSelectSatellite, trail, aiHighlightedIds = [], simulatedManeuver }) {
  const [debrisPos, setDebrisPos] = useState(null);

  useEffect(() => {
    const handler = (e) => {
       const c = e.detail;
       if (c.sat1_position && c.sat2_position) {
           const x1 = isNaN(c.sat1_position.x) ? 0 : c.sat1_position.x;
           const y1 = isNaN(c.sat1_position.y) ? 0 : c.sat1_position.y;
           const z1 = isNaN(c.sat1_position.z) ? 0 : c.sat1_position.z;
           const x2 = isNaN(c.sat2_position.x) ? 0 : c.sat2_position.x;
           const y2 = isNaN(c.sat2_position.y) ? 0 : c.sat2_position.y;
           const z2 = isNaN(c.sat2_position.z) ? 0 : c.sat2_position.z;

           setDebrisPos([
              (x1 + x2) / 2,
              (y1 + y2) / 2,
              (z1 + z2) / 2,
           ]);
       }
    };
    window.addEventListener('triggerDebris', handler);
    return () => window.removeEventListener('triggerDebris', handler);
  }, []);

  const collisionZones = useMemo(() => {
    if (!collisions) return [];
    return collisions.map(c => {
      if (!c.sat1_position || !c.sat2_position) return null;
      const x1 = isNaN(c.sat1_position.x) ? 0 : c.sat1_position.x;
      const y1 = isNaN(c.sat1_position.y) ? 0 : c.sat1_position.y;
      const z1 = isNaN(c.sat1_position.z) ? 0 : c.sat1_position.z;
      const x2 = isNaN(c.sat2_position.x) ? 0 : c.sat2_position.x;
      const y2 = isNaN(c.sat2_position.y) ? 0 : c.sat2_position.y;
      const z2 = isNaN(c.sat2_position.z) ? 0 : c.sat2_position.z;

      return {
        position: [
          (x1 + x2) / 2,
          (y1 + y2) / 2,
          (z1 + z2) / 2,
        ],
        riskLevel: c.risk_level,
        riskScore: c.risk_score,
        distance: c.min_distance_km,
      };
    }).filter(Boolean);
  }, [collisions]);

  return (
    <Canvas
      camera={{ position: [0, 0.5, 3.2], fov: 45, near: 0.01, far: 100 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
    >
      {/* Deep space background — matches UI bg */}
      <color attach="background" args={['#050a18']} />
      <fog attach="fog" args={['#050a18', 14, 35]} />

      <Suspense fallback={null}>
        {/* Cinematic Lighting — Key/Fill/Rim setup */}
        <ambientLight intensity={0.20} color="#b8c8ff" />
        
        {/* Key light (Sun) — far away so it doesn't appear as a blob */}
        <directionalLight 
          position={[15, 5, 10]} 
          intensity={2.5} 
          color="#fff8ee" 
        />
        
        {/* Fill light — subtle blue to illuminate dark side */}
        <pointLight position={[-8, -3, -6]} intensity={0.2} color="#3366cc" />
        
        {/* Rim light — soft cyan accent */}
        <pointLight position={[0, -4, 3]} intensity={0.25} color="#06b6d4" distance={10} />

        {/* Deep Field Stars */}
        <Stars radius={60} depth={60} count={6000} factor={3} saturation={0.3} fade speed={0.15} />

        <Earth />
        <DensityField positions={positions} />
        {debrisPos && <DebrisField position={debrisPos} count={150} />}

        {positions?.map(sat => (
          <Satellite
            key={sat.norad_id}
            position={[sat.x, sat.y, sat.z]}
            name={sat.name}
            noradId={sat.norad_id}
            altitude={sat.alt}
            riskLevel={sat.risk_level || 'NONE'}
            riskScore={sat.risk_score || 0}
            isSelected={selectedSatId === sat.norad_id}
            isAiHighlighted={aiHighlightedIds.includes(sat.norad_id)}
            onClick={() => onSelectSatellite?.(sat)}
          />
        ))}

        {trail && trail.length > 0 && (
          <OrbitTrail
            points={trail}
            riskLevel={positions?.find(p => p.norad_id === selectedSatId)?.risk_level || 'NONE'}
          />
        )}

        {/* Simulated Maneuver Trajectory */}
        {simulatedManeuver && simulatedManeuver.maneuver?.trajectory && (
          <OrbitTrail
            points={simulatedManeuver.maneuver.trajectory}
            colorOverride="#10b981"
            isSimulated={true}
          />
        )}

        {collisionZones.map((zone, i) => (
          <CollisionZone
            key={i}
            position={zone.position}
            riskLevel={zone.riskLevel}
            riskScore={zone.riskScore}
            distance={zone.distance}
          />
        ))}

        {/* Post Processing */}
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom 
            luminanceThreshold={2.5} 
            mipmapBlur 
            intensity={0.3} 
            radius={0.3}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>

        <CameraRig selectedSatId={selectedSatId} positions={positions} collisions={collisions} />

      </Suspense>
    </Canvas>
  );
}
