import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
// Post-processing removed — causes WebGL context loss on integrated GPUs
import * as THREE from 'three';
import { easing } from 'maath';

import Earth from './Earth';
import Satellite from './Satellite';
import CollisionZone from './CollisionZone';
import OrbitTrail from './OrbitTrail';
// DensityField removed — causes WebGL crashes on integrated GPUs
import OrbitalGrid from './OrbitalGrid';
import CollisionBeam from './CollisionBeam';
import SatelliteLabel from './SatelliteLabel';

/**
 * CameraRig — smooth focus on selected satellites + cinematic auto-rotate idle
 */
function CameraRig({ selectedSatId, positions, autoRotate }) {
  const controlsRef = useRef();

  const focusTarget = useMemo(() => {
    if (!selectedSatId) return null;
    const sat = positions?.find(p => p.norad_id === selectedSatId);
    if (sat) return new THREE.Vector3(sat.x, sat.y, sat.z);
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
      ref={controlsRef}
      enablePan={false}
      minDistance={1.5}
      maxDistance={8}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      autoRotate={autoRotate && !focusTarget}
      autoRotateSpeed={0.3}
      enabled={!focusTarget}
    />
  );
}

/**
 * AmbientParticles — subtle floating dust particles for depth
 */
function AmbientParticles() {
  const ref = useRef();
  const count = 200;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.005;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.008}
        color="#6366f1"
        transparent
        opacity={0.25}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export default function Scene({
  positions,
  collisions,
  selectedSatId,
  onSelectSatellite,
  trail,
  deviationTrail,
  showGrid = true,
  showBeams = true,
  showLabels = true,
  autoRotate = true,
}) {
  const collisionZones = useMemo(() => {
    if (!collisions) return [];
    return collisions.map(c => {
      if (!c.sat1_position || !c.sat2_position) return null;
      return {
        position: [
          (c.sat1_position.x + c.sat2_position.x) / 2,
          (c.sat1_position.y + c.sat2_position.y) / 2,
          (c.sat1_position.z + c.sat2_position.z) / 2,
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
      gl={{ antialias: false, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('[FORGE-X] WebGL context lost — will auto-restore');
        });
        gl.domElement.addEventListener('webglcontextrestored', () => {
          console.log('[FORGE-X] WebGL context restored');
        });
      }}
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
        <Stars radius={60} depth={60} count={3000} factor={3} saturation={0.3} fade speed={0.15} />


        <Earth />

        {/* Digital Twin: Orbital Grid */}
        <OrbitalGrid visible={showGrid} />



        {positions?.map(sat => (
          <Satellite
            key={sat.norad_id}
            position={[sat.x, sat.y, sat.z]}
            name={sat.name}
            noradId={sat.norad_id}
            altitude={sat.alt}
            velocity={sat.vx !== undefined ? { vx: sat.vx, vy: sat.vy, vz: sat.vz } : null}
            riskLevel={sat.risk_level || 'NONE'}
            riskScore={sat.risk_score || 0}
            isSelected={selectedSatId === sat.norad_id}
            onClick={() => onSelectSatellite?.(sat)}
          />
        ))}

        {/* Digital Twin: 3D Satellite Labels */}
        {showLabels && positions?.map(sat => (
          <SatelliteLabel
            key={`label-${sat.norad_id}`}
            satellite={sat}
            isSelected={selectedSatId === sat.norad_id}
            visible={showLabels}
          />
        ))}

        {trail && trail.length > 0 && (
          <OrbitTrail
            points={trail}
            riskLevel={positions?.find(p => p.norad_id === selectedSatId)?.risk_level || 'NONE'}
          />
        )}

        {deviationTrail && deviationTrail.length > 0 && (
          <OrbitTrail
            points={deviationTrail}
            riskLevel="SIMULATED"
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

        {/* Digital Twin: Collision Beams */}
        {showBeams && collisions?.map((collision, i) => (
          <CollisionBeam
            key={`beam-${i}`}
            collision={collision}
            visible={showBeams}
          />
        ))}



        <CameraRig
          selectedSatId={selectedSatId}
          positions={positions}
          collisions={collisions}
          autoRotate={autoRotate}
        />

      </Suspense>
    </Canvas>
  );
}
