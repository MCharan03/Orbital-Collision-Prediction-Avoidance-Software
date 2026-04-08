import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import axios from 'axios';

/* ─────────────── Utility: risk theme ─────────────── */
const RISK_THEMES = {
  LOW: {
    glow: 'rgba(16, 185, 129, 0.6)',
    glowDim: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    label: '#10b981',
    badge: 'LOW',
    particle: '#10b981',
  },
  MEDIUM: {
    glow: 'rgba(245, 158, 11, 0.7)',
    glowDim: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    label: '#f59e0b',
    badge: 'MEDIUM',
    particle: '#f59e0b',
  },
  HIGH: {
    glow: 'rgba(239, 68, 68, 0.8)',
    glowDim: 'rgba(239, 68, 68, 0.18)',
    border: 'rgba(239, 68, 68, 0.5)',
    label: '#ef4444',
    badge: 'HIGH',
    particle: '#ff4757',
  },
};

/* ─────────────── Floating Particle Dots ─────────────── */
function ParticleField() {
  const particles = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      speed: Math.random() * 18 + 10,
      opacity: Math.random() * 0.4 + 0.1,
      delay: Math.random() * 6,
    }))
  ).current;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(96, 165, 250, 0.7)',
            boxShadow: '0 0 6px rgba(96, 165, 250, 0.5)',
          }}
          animate={{ y: [0, -30, 0], opacity: [p.opacity, p.opacity * 2, p.opacity] }}
          transition={{ duration: p.speed, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─────────────── Scanning Line Effect ─────────────── */
function ScanLine() {
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.5) 20%, rgba(168,85,247,0.8) 50%, rgba(6,182,212,0.5) 80%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none',
        boxShadow: '0 0 20px rgba(6,182,212,0.4)',
      }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

/* ─────────────── Thinking Animation ─────────────── */
function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px' }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-ai)' }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-ai)', letterSpacing: '0.15em', opacity: 0.8 }}>
        PROCESSING TELEMETRY...
      </span>
    </div>
  );
}

/* ─────────────── A single draggable response card ─────────────── */
function AIResponseCard({ response, index, total, onExpand, isExpanded }) {
  const theme = RISK_THEMES[response.risk_level] || RISK_THEMES.LOW;

  // z-depth layering: newest = front
  const depthIndex = total - index;
  const scaleFactor = 1 - index * 0.025;
  const blurAmount = index * 1.2;
  const yOffset = index * -14;
  const opacityVal = 1 - index * 0.18;

  // Random initial float angles for each card
  const tiltX = useRef((Math.random() - 0.5) * 6).current;
  const tiltY = useRef((Math.random() - 0.5) * 4).current;
  const floatDuration = useRef(4 + Math.random() * 3).current;
  const floatDelay = useRef(Math.random() * 2).current;

  return (
    <motion.div
      drag
      dragMomentum={true}
      dragElastic={0.12}
      whileDrag={{ scale: 1.03, zIndex: 9999, filter: 'blur(0px)' }}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 130,
        translateX: '-50%',
        width: isExpanded ? 560 : 480,
        zIndex: depthIndex,
        filter: index > 0 ? `blur(${blurAmount}px)` : 'none',
        opacity: opacityVal,
        cursor: 'grab',
        userSelect: 'none',
      }}
      initial={{ opacity: 0, scale: 0.82, y: 60, rotateX: 15 }}
      animate={{
        opacity: opacityVal,
        scale: scaleFactor,
        y: yOffset,
        rotateX: tiltX,
        rotateY: isExpanded ? 0 : tiltY,
        transition: { type: 'spring', stiffness: 160, damping: 22 },
      }}
      exit={{ opacity: 0, scale: 0.75, y: 40, transition: { duration: 0.25 } }}
      whileHover={
        index === 0
          ? { scale: 1.03, y: yOffset - 8, rotateX: 0, rotateY: 0, filter: 'blur(0px)' }
          : {}
      }
      onClick={() => index === 0 && onExpand()}
    >
      {/* Zero-gravity drift on top card */}
      {index === 0 && (
        <motion.div
          style={{ position: 'absolute', inset: 0 }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: floatDuration, repeat: Infinity, delay: floatDelay, ease: 'easeInOut' }}
        />
      )}

      <div
        style={{
          background: `linear-gradient(135deg, rgba(8,12,28,0.82) 0%, rgba(15,20,45,0.78) 100%)`,
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          padding: isExpanded ? '28px 30px' : '20px 24px',
          boxShadow: [
            `0 0 0 1px rgba(255,255,255,0.04)`,
            `0 20px 60px rgba(0,0,0,0.55)`,
            `0 0 40px ${theme.glowDim}`,
            `inset 0 1px 0 rgba(255,255,255,0.08)`,
          ].join(', '),
          position: 'relative',
          overflow: 'hidden',
          transition: 'padding 0.35s, width 0.35s',
        }}
      >
        {/* Top glow edge */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: `linear-gradient(90deg, transparent, ${theme.glow}, transparent)`,
          filter: `blur(1px)`,
        }} />

        {/* Ambient orb behind content */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 140, height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.glowDim} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Corner scanner lines */}
        <div style={{ position: 'absolute', top: 10, left: 10, width: 18, height: 18, borderTop: `1.5px solid ${theme.label}`, borderLeft: `1.5px solid ${theme.label}`, opacity: 0.6, borderRadius: '2px 0 0 0' }} />
        <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderTop: `1.5px solid ${theme.label}`, borderRight: `1.5px solid ${theme.label}`, opacity: 0.6, borderRadius: '0 2px 0 0' }} />
        <div style={{ position: 'absolute', bottom: 10, left: 10, width: 18, height: 18, borderBottom: `1.5px solid ${theme.label}`, borderLeft: `1.5px solid ${theme.label}`, opacity: 0.6, borderRadius: '0 0 0 2px' }} />
        <div style={{ position: 'absolute', bottom: 10, right: 10, width: 18, height: 18, borderBottom: `1.5px solid ${theme.label}`, borderRight: `1.5px solid ${theme.label}`, opacity: 0.6, borderRadius: '0 0 2px 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Pulsing status dot */}
            <motion.div
              style={{ width: 8, height: 8, borderRadius: '50%', background: theme.label, boxShadow: `0 0 12px ${theme.glow}` }}
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--color-accent)', textTransform: 'uppercase', opacity: 0.7 }}>
              TRAFFIC MANAGER AI
            </span>
          </div>
          {/* Risk badge */}
          <div style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800,
            fontFamily: 'var(--font-display)', letterSpacing: '0.12em', textTransform: 'uppercase',
            background: theme.glowDim, border: `1px solid ${theme.border}`, color: theme.label,
            boxShadow: `0 0 12px ${theme.glowDim}`,
          }}>
            {theme.badge}
          </div>
        </div>

        {/* Summary */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          color: '#fff', marginBottom: 12, lineHeight: 1.5, position: 'relative', zIndex: 1,
          textShadow: `0 0 30px rgba(255,255,255,0.1)`,
        }}>
          {response.summary}
        </div>

        {/* Details (expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}
            >
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
                {response.details}
              </p>

              {/* Recommended action */}
              <div style={{
                background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)',
                borderRadius: 12, padding: '10px 14px', marginBottom: 14,
              }}>
                <div style={{ fontSize: 9, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
                  ⚡ RECOMMENDED ACTION
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                  {response.recommended_action}
                </div>
              </div>

              {/* Affected satellites */}
              {response.simulation_data?.affected_satellites?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>TRACKING:</span>
                  {response.simulation_data.affected_satellites.map(id => (
                    <span key={id} style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 8px',
                      borderRadius: 6, background: 'rgba(168,85,247,0.12)',
                      border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc',
                    }}>
                      #{id}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer hint */}
        {index === 0 && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
              {isExpanded ? '⬆ CLICK TO COLLAPSE' : '⬇ CLICK TO EXPAND · DRAG TO MOVE'}
            </span>
            {response.simulation_data?.collision_predicted && (
              <motion.span
                style={{ fontSize: 9, color: '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                ⚠ COLLISION VECTOR ACTIVE
              </motion.span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────── QUERY SUGGESTIONS ─────────────── */
const SUGGESTIONS = [
  'Predict collisions in next 6 hours',
  'Show safest burn window for ISS',
  'What if a satellite loses communication?',
  'Analyze Starlink debris risk',
  'Emergency avoidance for high-risk conjunction',
];

/* ─────────────── MAIN COMPONENT ─────────────── */
export default function TrafficManagerAI({ satelliteContext, onHighlightSatellites }) {
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = useCallback(async (q) => {
    const text = q || query;
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setQuery('');
    setShowSuggestions(false);
    setExpandedIndex(0);

    // Build concise context for the AI
    const context = {
      active_satellites: satelliteContext?.length || 0,
      high_risk_count: satelliteContext?.filter(s => s.risk_level === 'HIGH').length || 0,
      sample_sats: (satelliteContext || []).slice(0, 8).map(s => ({
        id: s.norad_id, name: s.name, alt: s.alt?.toFixed(0), risk: s.risk_level,
      })),
    };

    try {
      const res = await axios.post('http://localhost:5000/api/traffic-manager/query', {
        query: text,
        context,
      });
      const data = res.data;

      // Notify parent to highlight satellites in 3D scene
      if (data.simulation_data?.affected_satellites?.length > 0) {
        onHighlightSatellites?.(data.simulation_data.affected_satellites);
      }

      // Push new response to the front
      setResponses(prev => [data, ...prev].slice(0, 5));
    } catch (err) {
      setResponses(prev => [{
        summary: 'Neural uplink disrupted. Check backend connection.',
        risk_level: 'MEDIUM',
        details: err.message,
        recommended_action: 'Verify Flask backend is running on port 5000.',
        simulation_data: { affected_satellites: [], collision_predicted: false },
      }, ...prev].slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, satelliteContext, onHighlightSatellites]);

  return (
    <>
      <ParticleField />
      <ScanLine />

      {/* ─── Toggle Button ─── */}
      <motion.button
        id="ai-toggle-btn"
        onClick={() => { setIsOpen(o => !o); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 300); }}
        style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.9) 0%, rgba(6,182,212,0.8) 100%)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white', fontSize: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(168,85,247,0.5), 0 0 60px rgba(168,85,247,0.2)',
        }}
        animate={{ boxShadow: isOpen
          ? ['0 0 30px rgba(168,85,247,0.5)', '0 0 50px rgba(6,182,212,0.7)', '0 0 30px rgba(168,85,247,0.5)']
          : ['0 0 20px rgba(168,85,247,0.4)', '0 0 35px rgba(168,85,247,0.6)', '0 0 20px rgba(168,85,247,0.4)']
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
      >
        {isOpen ? '✕' : '🛸'}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* ─── Response Cards Layer ─── */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 500, perspective: '1200px' }}>
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    key="thinking"
                    style={{
                      position: 'absolute', bottom: 130, left: '50%', translateX: '-50%',
                      background: 'rgba(8,12,28,0.85)', backdropFilter: 'blur(40px)',
                      border: '1px solid rgba(168,85,247,0.3)', borderRadius: 16,
                      pointerEvents: 'none', zIndex: 600,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <ThinkingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="popLayout">
                {responses.map((resp, i) => (
                  <AIResponseCard
                    key={`${resp.summary?.slice(0, 20)}-${i}`}
                    response={resp}
                    index={i}
                    total={responses.length}
                    isExpanded={expandedIndex === i && i === 0}
                    onExpand={() => setExpandedIndex(prev => prev === 0 ? null : 0)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* ─── Floating Input Bar ─── */}
            <motion.div
              key="input-bar"
              style={{ position: 'fixed', bottom: 32, left: '50%', translateX: '-50%', zIndex: 1000, width: 580 }}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              {/* Suggestions tray */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
                    }}
                  >
                    {SUGGESTIONS.map(s => (
                      <motion.button
                        key={s}
                        onClick={() => handleSubmit(s)}
                        style={{
                          background: 'rgba(15,20,45,0.85)', backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(168,85,247,0.25)',
                          borderRadius: 20, padding: '5px 14px',
                          color: 'rgba(200,210,255,0.85)', fontSize: 11, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s',
                        }}
                        whileHover={{
                          background: 'rgba(168,85,247,0.18)',
                          borderColor: 'rgba(168,85,247,0.5)',
                          y: -2,
                        }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The main glassmorphic input capsule */}
              <motion.div
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(6,8,20,0.75)', backdropFilter: 'blur(60px)',
                  WebkitBackdropFilter: 'blur(60px)',
                  border: '1px solid rgba(168,85,247,0.35)',
                  borderRadius: 56, padding: '10px 14px 10px 24px',
                  boxShadow: [
                    '0 0 0 1px rgba(255,255,255,0.04)',
                    '0 20px 60px rgba(0,0,0,0.6)',
                    '0 0 40px rgba(168,85,247,0.2)',
                    'inset 0 1px 0 rgba(255,255,255,0.08)',
                  ].join(', '),
                }}
                animate={{ boxShadow: isLoading
                  ? ['0 0 40px rgba(168,85,247,0.3)', '0 0 70px rgba(6,182,212,0.4)', '0 0 40px rgba(168,85,247,0.3)']
                  : '0 0 40px rgba(168,85,247,0.15), 0 20px 60px rgba(0,0,0,0.6)'
                }}
                transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0 }}
              >
                {/* AI Icon */}
                <motion.div
                  style={{ fontSize: 18, flexShrink: 0 }}
                  animate={{ rotate: isLoading ? 360 : 0 }}
                  transition={{ duration: 2, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
                >
                  🛰
                </motion.div>

                <input
                  ref={inputRef}
                  id="ai-query-input"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="Ask the Traffic Manager..."
                  disabled={isLoading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#e2e8f0', fontSize: 14, fontFamily: 'var(--font-sans)',
                    fontWeight: 400,
                  }}
                />

                {/* Send button */}
                <motion.button
                  id="ai-send-btn"
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !query.trim()}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                    background: query.trim()
                      ? 'linear-gradient(135deg, #a855f7, #06b6d4)'
                      : 'rgba(255,255,255,0.06)',
                    color: 'white', fontSize: 16, cursor: query.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: query.trim() ? '0 0 20px rgba(168,85,247,0.4)' : 'none',
                    transition: 'all 0.3s',
                  }}
                  whileTap={query.trim() ? { scale: 0.88 } : {}}
                >
                  {isLoading ? (
                    <motion.div
                      style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : '⟶'}
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
