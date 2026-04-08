import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RISK_COLORS } from '../../constants';

// Generate a procedural satellite icon sprite texture
function createSatelliteTexture(color) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size / 2;

  // Clear canvas for a transparent background
  ctx.clearRect(0, 0, size, size);

  // Draw Satellite Emoji
  ctx.font = '64px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fillText('🛰️', cx, cy + 4); // +4 for slight vertical optical alignment

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Cache textures per color
const textureCache = {};
function getSatelliteTexture(color) {
  if (!textureCache[color]) {
    textureCache[color] = createSatelliteTexture(color);
  }
  return textureCache[color];
}

export default function Satellite({ position, name, noradId, altitude, riskLevel = 'NONE', riskScore = 0, onClick, isSelected, isAiHighlighted = false }) {
  const spriteRef = useRef();
  const glowRef = useRef();
  const ringRef = useRef();
  const aiRingRef = useRef();
  const [hovered, setHovered] = useState(false);

  const baseColor = RISK_COLORS[riskLevel] || RISK_COLORS.NONE;
  const isHighRisk = riskLevel === 'HIGH';
  const isMedium = riskLevel === 'MEDIUM';
  const isLowRisk = riskLevel === 'LOW';
  const hasGlow = isHighRisk || isMedium || isLowRisk;

  const bloomColor = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (isHighRisk) c.multiplyScalar(4.0);
    else if (isMedium) c.multiplyScalar(2.0);
    else if (isLowRisk) c.multiplyScalar(1.2);
    else c.multiplyScalar(1.0);
    return c;
  }, [baseColor, isHighRisk, isMedium, isLowRisk]);

  const spriteTexture = useMemo(() => getSatelliteTexture(baseColor), [baseColor]);

  const spriteMaterial = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: spriteTexture,
      color: 0xffffff, // White preserves the emoji colors
      transparent: true,
      blending: THREE.NormalBlending, // Normal blending so emoji doesn't wash out
      depthWrite: false,
      toneMapped: false,
    });
  }, [spriteTexture]);

  useFrame((state) => {
    if (!spriteRef.current) return;
    const t = state.clock.elapsedTime;
    const baseScale = 0.045; // reduced back to normal

    if (isHighRisk) {
      const pulse = Math.sin(t * 5) * 0.4 + 1;
      const s = baseScale * pulse * (hovered ? 1.5 : 1);
      spriteRef.current.scale.set(s, s, 1);
      if (glowRef.current) {
        glowRef.current.scale.setScalar(pulse * 3);
        glowRef.current.material.opacity = 0.2 + Math.sin(t * 3) * 0.15;
      }
    } else if (isMedium) {
      const pulse = Math.sin(t * 2) * 0.15 + 1;
      const s = baseScale * pulse * (hovered ? 1.3 : 1);
      spriteRef.current.scale.set(s, s, 1);
      if (glowRef.current) {
        glowRef.current.scale.setScalar(pulse * 2.5);
      }
    } else if (isLowRisk) {
      const pulse = Math.sin(t * 1) * 0.05 + 1;
      const s = baseScale * pulse * (hovered ? 1.2 : 1);
      spriteRef.current.scale.set(s, s, 1);
      if (glowRef.current) {
        glowRef.current.scale.setScalar(pulse * 2.0);
      }
    } else {
      const s = baseScale * (hovered ? 1.4 : 1);
      spriteRef.current.scale.set(s, s, 1);
    }

    if (ringRef.current && isSelected) {
      const ringScale = ((t * 1.2) % 1) * 4 + 1;
      ringRef.current.scale.setScalar(ringScale);
      ringRef.current.material.opacity = 1 - ((t * 1.2) % 1);
    }

    // AI highlight ring — slow purple pulse
    if (aiRingRef.current && isAiHighlighted) {
      const aiPulse = Math.sin(t * 2.5) * 0.5 + 1;
      aiRingRef.current.scale.setScalar(aiPulse * 2.2);
      aiRingRef.current.material.opacity = 0.5 + Math.sin(t * 2) * 0.3;
    }
  });

  if (!position || position.length < 3) return null;

  return (
    <group position={position}>
      {/* Satellite icon sprite */}
      <sprite
        ref={spriteRef}
        material={spriteMaterial}
        scale={[0.045, 0.045, 1]}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'crosshair'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      />

      {/* Hover Tooltip */}
      {hovered && (
        <Html distanceFactor={5} style={{ pointerEvents: 'none' }}>
          <div className="sat-tooltip">
            <div className="sat-tooltip-name">{name || 'Unknown'}</div>
            <div className="sat-tooltip-row">
              <span className="label">NORAD</span>
              <span className="value">{noradId}</span>
            </div>
            {altitude !== undefined && (
              <div className="sat-tooltip-row">
                <span className="label">Altitude</span>
                <span className="value">{altitude?.toFixed(0)} km</span>
              </div>
            )}
            <div className="sat-tooltip-row">
              <span className="label">Risk</span>
              <span className="value" style={{ color: baseColor }}>{riskLevel}</span>
            </div>
            {riskScore > 0 && (
              <div className="sat-tooltip-row">
                <span className="label">Score</span>
                <span className="value">{riskScore}/100</span>
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Glow sphere for risk levels */}
      {hasGlow && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshBasicMaterial
            color={bloomColor}
            toneMapped={false}
            transparent
            opacity={isLowRisk ? 0.1 : 0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* AI Highlight ring — purple pulsing halo */}
      {isAiHighlighted && (
        <mesh ref={aiRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.03, 0.038, 48]} />
          <meshBasicMaterial
            color={new THREE.Color('#a855f7').multiplyScalar(3)}
            toneMapped={false}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
