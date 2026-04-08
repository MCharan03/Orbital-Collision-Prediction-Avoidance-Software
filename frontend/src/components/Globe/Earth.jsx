import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// NASA Blue Marble texture URLs (public domain)
const EARTH_DAY_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_NIGHT_URL = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
const EARTH_TOPO_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const CLOUD_MAP_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_2048.png';

/**
 * Earth.jsx — Premium 3D Earth with realistic atmosphere and cloud layers.
 * 
 * Features:
 * - Multi-layered globe: Earth surface, cloud layer, and atmosphere.
 * - Proper material settings for day/night transition.
 * - Dynamic clouds that rotate at a different speed than the surface.
 * - Cinematic Fresnel atmosphere glow.
 */
export default function Earth() {
  const earthRef = useRef();
  const cloudRef = useRef();
  const atmosphereRef = useRef();

  // Load real NASA textures
  const [dayMap, nightMap, topoMap, cloudMap] = useLoader(THREE.TextureLoader, [
    EARTH_DAY_URL,
    EARTH_NIGHT_URL,
    EARTH_TOPO_URL,
    CLOUD_MAP_URL
  ]);

  // Set proper color space for textures
  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
  }, [dayMap, nightMap, cloudMap]);

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
          fresnel = pow(fresnel, 8.0); // Sharper edge
          fresnel = clamp(fresnel, 0.0, 1.0);

          // Subtle atmospheric blue tint
          vec3 color = vec3(0.2, 0.5, 1.0);

          float alpha = fresnel * 0.25;
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
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.025; // Clouds move slightly faster
    }
    // Update camera position uniform for Fresnel calculation
    if (atmosphereMaterial.uniforms) {
      atmosphereMaterial.uniforms.uCameraPosition.value.copy(camera.position);
    }
  });

  return (
    <group>
      {/* Earth surface layer */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={new THREE.Color(0x333333)} // Subtler night lights
          emissiveIntensity={0.06}
          bumpMap={topoMap}
          bumpScale={0.02}
          roughness={0.8}
          metalness={0.01}
        />
      </mesh>

      {/* Dynamic cloud layer */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[1.015, 64, 64]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent={true}
          opacity={0.4}
          depthWrite={false}
          blending={THREE.NormalBlending}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Atmosphere glow — realistic Rayleigh scattering simulation edge */}
      <mesh ref={atmosphereRef} material={atmosphereMaterial}>
        <sphereGeometry args={[1.035, 128, 128]} />
      </mesh>
    </group>
  );
}
