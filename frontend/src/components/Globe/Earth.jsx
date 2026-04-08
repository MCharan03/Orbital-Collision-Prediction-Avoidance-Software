import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// NASA Blue Marble texture URLs (public domain)
const EARTH_DAY_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_NIGHT_URL = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
const EARTH_TOPO_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const EARTH_CLOUDS_URL = 'https://unpkg.com/three-globe/example/img/earth-water.png';

/**
 * Earth.jsx — Premium 3D Earth with realistic atmosphere and cloud layer.
 * 
 * Fixes:
 * - Lowered emissiveIntensity so the day texture isn't washed out
 * - Rewrote atmosphere shader for a soft, realistic Fresnel glow (not a hard ring)
 * - Added animated cloud layer for Digital Twin realism
 * - Tuned material for vibrant oceans and crisp continents
 */
export default function Earth() {
  const earthRef = useRef();
  const atmosphereRef = useRef();
  const cloudsRef = useRef();

  // Load real NASA textures
  const [dayMap, nightMap, topoMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    EARTH_DAY_URL,
    EARTH_NIGHT_URL,
    EARTH_TOPO_URL,
    EARTH_CLOUDS_URL,
  ]);

  // Set proper color space for textures
  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
  }, [dayMap, nightMap]);

  // Atmosphere shader — soft Fresnel glow that wraps the globe edge
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        uniform vec3 uCameraPosition;

        void main() {
          vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
          float fresnel = 1.0 - dot(viewDir, vWorldNormal);
          fresnel = pow(fresnel, 6.0);
          fresnel = clamp(fresnel, 0.0, 1.0);

          // Very subtle atmospheric tint
          vec3 color = vec3(0.15, 0.4, 0.85);

          float alpha = fresnel * 0.18;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uCameraPosition: { value: new THREE.Vector3() },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame(({ camera }, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.015;
    }
    // Cloud layer rotates slightly faster for parallax depth effect
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.025;
    }
    // Update camera position uniform for Fresnel calculation
    if (atmosphereMaterial.uniforms) {
      atmosphereMaterial.uniforms.uCameraPosition.value.copy(camera.position);
    }
  });

  return (
    <group>
      {/* Earth sphere with real NASA textures */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={new THREE.Color(0xffcc88)}
          emissiveIntensity={0.15}
          bumpMap={topoMap}
          bumpScale={0.03}
          roughness={0.7}
          metalness={0.02}
        />
      </mesh>

      {/* Cloud layer — slightly larger, independent rotation */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.008, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Atmosphere glow — razor-thin Fresnel edge */}
      <mesh ref={atmosphereRef} material={atmosphereMaterial}>
        <sphereGeometry args={[1.025, 128, 128]} />
      </mesh>
    </group>
  );
}
