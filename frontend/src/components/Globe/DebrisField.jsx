import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function DebrisField({ position, count = 150 }) {
  const meshRef = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
        // Generate spherical vectors for an explosion burst
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(Math.random() * 2 - 1);
        
        // Random velocity bursts
        const v = Math.random() * 1.5 + 0.5;
        const vx = v * Math.sin(phi) * Math.cos(theta);
        const vy = v * Math.sin(phi) * Math.sin(theta);
        const vz = v * Math.cos(phi);
        
        temp.push({
            position: [position[0], position[1], position[2]],
            velocity: [vx, vy, vz],
            lifetime: 0,
            scale: Math.random() * 0.05 + 0.01
        });
    }
    return temp;
  }, [position, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Animate particles expanding
    particles.forEach((p, i) => {
        p.lifetime += delta;
        p.position[0] += p.velocity[0] * delta;
        p.position[1] += p.velocity[1] * delta;
        p.position[2] += p.velocity[2] * delta;
        
        // Slightly rotate their expanding matrix
        dummy.position.set(p.position[0], p.position[1], p.position[2]);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!position) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <icosahedronGeometry args={[0.02, 0]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}
