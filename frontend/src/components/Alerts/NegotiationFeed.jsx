import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NegotiationFeed({ resolutions, onClose }) {
  const [visibleLogs, setVisibleLogs] = useState([]);
  const bottomRef = useRef(null);

  // Stream logs sequentially for dramatic effect
  useEffect(() => {
    if (!resolutions || !Array.isArray(resolutions) || resolutions.length === 0) return;
    
    // Reset visible logs on new resolutions
    setVisibleLogs([]);
    
    // Flatten all logs from all resolutions (with safety check)
    const allLogs = resolutions.flatMap(res => (res && Array.isArray(res.logs)) ? res.logs : []);
    
    if (allLogs.length === 0) return;
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < allLogs.length) {
        setVisibleLogs(prev => [...prev, allLogs[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [resolutions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs]);

  const getLogStyle = (text) => {
    if (!text || typeof text !== 'string') return { color: '#e2e8f0' };
    if (text.startsWith('[NEGOTIATE]')) return { color: '#a855f7' };
    if (text.startsWith('[DECISION]')) return { color: '#eab308' };
    if (text.startsWith('[SIMULATE]')) return { color: '#22d3ee' };
    if (text.startsWith('[ACTION]')) return { color: '#22c55e', fontWeight: 'bold' };
    if (text.startsWith('[CRITICAL]')) return { color: '#ef4444', fontWeight: 'bold' };
    return { color: '#e2e8f0' };
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="negotiation-feed"
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxWidth: '900px',
          height: '250px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '12px',
          zIndex: 2500,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#a855f7', fontWeight: 'bold' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%', boxShadow: '0 0 10px #a855f7', animation: 'pulse 1.5s infinite' }}></span>
            AUTONOMOUS NEGOTIATION FEED
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.6' }}>
          {visibleLogs.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)' }}>Awaiting resolution protocols...</div>
          )}
          {visibleLogs.map((log, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ marginBottom: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '8px' }}>&gt;</span>
              <span style={getLogStyle(log)}>{String(log || '')}</span>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
