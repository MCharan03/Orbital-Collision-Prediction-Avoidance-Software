import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

/**
 * TimeSlider.jsx — Time simulation control with play/pause and scrubbing.
 */
export default function TimeSlider({ onTimeChange, isLoading }) {
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);
  const maxMinutes = 24 * 60; // 24 hours

  const currentTime = new Date(Date.now() + offsetMinutes * 60 * 1000);

  const handleSliderChange = useCallback((e) => {
    const val = parseInt(e.target.value);
    setOffsetMinutes(val);
    onTimeChange?.(new Date(Date.now() + val * 60 * 1000));
  }, [onTimeChange]);

  // Play/Pause logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setOffsetMinutes(prev => {
          const next = prev + speed * 5; // 5 minutes per tick
          if (next >= maxMinutes) {
            setIsPlaying(false);
            return maxMinutes;
          }
          const newTime = new Date(Date.now() + next * 60 * 1000);
          onTimeChange?.(newTime);
          return next;
        });
      }, 1000); // Every second, advance 5 min of sim time
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, onTimeChange, maxMinutes]);

  const handleReset = () => {
    setOffsetMinutes(0);
    setIsPlaying(false);
    onTimeChange?.(new Date());
  };

  const formatTime = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const formatOffset = () => {
    if (offsetMinutes === 0) return 'NOW';
    const h = Math.floor(offsetMinutes / 60);
    const m = offsetMinutes % 60;
    return `+${h}h ${m}m`;
  };

  return (
    <motion.div 
      className="time-slider-container"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>TIME</span>
      </div>

      <button
        className={`time-btn ${isPlaying ? 'active' : ''}`}
        onClick={() => setIsPlaying(!isPlaying)}
        disabled={isLoading}
      >
        {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
      </button>

      <div className="slider-track-wrap">
        <div className="slider-info">
          <span className="slider-clock">{formatTime(currentTime)}</span>
          <span className="slider-offset">{formatOffset()}</span>
        </div>
        <input
          type="range"
          className="time-slider-input"
          min="0"
          max={maxMinutes}
          step="5"
          value={offsetMinutes}
          onChange={handleSliderChange}
          disabled={isLoading}
        />
      </div>

      <button className="time-btn" onClick={handleReset} style={{ minWidth: '80px' }}>
        ↺ NOW
      </button>

      <select
        className="time-btn"
        value={speed}
        onChange={(e) => setSpeed(parseInt(e.target.value))}
        style={{ minWidth: '70px', paddingRight: '24px' }}
      >
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={5}>5x</option>
        <option value={10}>10x</option>
      </select>
    </motion.div>
  );
}
