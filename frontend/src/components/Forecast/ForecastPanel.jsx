import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle, Clock, Shield, Radar } from 'lucide-react';

/**
 * ForecastPanel.jsx — 24-Hour Predictive Forecast for Proactive Space Traffic Management.
 *
 * Displays:
 *  1. Interactive 24-hour timeline bar chart (risk per hour)
 *  2. Compact risk heatmap row
 *  3. Peak alert card (most dangerous hour)
 *  4. Forecast summary stats
 */

const RISK_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
  CLEAR: '#1e293b',
};

const RISK_GLOW = {
  HIGH: 'rgba(239, 68, 68, 0.4)',
  MEDIUM: 'rgba(245, 158, 11, 0.3)',
  LOW: 'rgba(34, 197, 94, 0.2)',
  CLEAR: 'transparent',
};

const TREND_CONFIG = {
  ESCALATING: { icon: TrendingUp, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', label: 'ESCALATING' },
  STABLE: { icon: Minus, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', label: 'STABLE' },
  DEESCALATING: { icon: TrendingDown, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', label: 'DE-ESCALATING' },
};

function formatHourLabel(hourIndex) {
  const h = hourIndex;
  if (h === 0) return 'NOW';
  return `+${h}h`;
}

function formatTimeWindow(isoStart, isoEnd) {
  try {
    const s = new Date(isoStart);
    const e = new Date(isoEnd);
    const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${fmt(s)} – ${fmt(e)} UTC`;
  } catch {
    return '';
  }
}

export default function ForecastPanel({ forecast, loading }) {
  const [expanded, setExpanded] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null);

  if (loading) {
    return (
      <div className="forecast-panel glass-panel">
        <div className="forecast-header">
          <div className="forecast-title">
            <Radar size={16} className="forecast-icon spinning" />
            <span>24H PREDICTIVE FORECAST</span>
          </div>
        </div>
        <div className="forecast-loading">
          <div className="forecast-loading-bar" />
          <span>Propagating orbits...</span>
        </div>
      </div>
    );
  }

  if (!forecast || !forecast.hourly_buckets) {
    return (
      <div className="forecast-panel glass-panel">
        <div className="forecast-header">
          <div className="forecast-title">
            <Radar size={16} />
            <span>24H PREDICTIVE FORECAST</span>
          </div>
        </div>
        <div className="forecast-empty">
          <Shield size={20} />
          <span>No forecast data available</span>
        </div>
      </div>
    );
  }

  const { hourly_buckets, trend, peak_hour, summary } = forecast;
  const trendCfg = TREND_CONFIG[trend] || TREND_CONFIG.STABLE;
  const TrendIcon = trendCfg.icon;
  const maxRisk = Math.max(...hourly_buckets.map(b => b.peak_risk_score), 1);
  const peakBucket = hourly_buckets[peak_hour] || hourly_buckets[0];

  return (
    <motion.div
      className="forecast-panel glass-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* ── Header ────────────────────────── */}
      <div className="forecast-header" onClick={() => setExpanded(!expanded)}>
        <div className="forecast-title">
          <Radar size={16} className="forecast-icon" />
          <span>24H PREDICTIVE FORECAST</span>
        </div>
        <div className="forecast-header-right">
          <div
            className="forecast-trend-badge"
            style={{
              background: trendCfg.bg,
              borderColor: trendCfg.border,
              color: trendCfg.color,
            }}
          >
            <TrendIcon size={12} />
            <span>{trendCfg.label}</span>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="forecast-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── Heatmap Row ─────────────────── */}
            <div className="forecast-heatmap">
              {hourly_buckets.map((b, i) => (
                <div
                  key={i}
                  className={`forecast-heatmap-cell ${hoveredBar === i ? 'hovered' : ''}`}
                  style={{
                    background: RISK_COLORS[b.peak_risk_level],
                    boxShadow: hoveredBar === i ? `0 0 8px ${RISK_GLOW[b.peak_risk_level]}` : 'none',
                  }}
                  title={`T+${i}h: ${b.peak_risk_level} (score: ${b.peak_risk_score})`}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              ))}
            </div>

            {/* ── Timeline Bar Chart ─────────── */}
            <div className="forecast-timeline">
              {hourly_buckets.map((b, i) => {
                const heightPct = maxRisk > 0 ? (b.peak_risk_score / maxRisk) * 100 : 0;
                const isHovered = hoveredBar === i;
                const isPeak = i === peak_hour && b.peak_risk_score > 0;

                return (
                  <div
                    key={i}
                    className={`forecast-bar-wrapper ${isHovered ? 'hovered' : ''} ${isPeak ? 'peak' : ''}`}
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div className="forecast-bar-container">
                      <motion.div
                        className="forecast-bar"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPct, 2)}%` }}
                        transition={{ duration: 0.6, delay: i * 0.02, ease: 'easeOut' }}
                        style={{
                          background: `linear-gradient(to top, ${RISK_COLORS[b.peak_risk_level]}cc, ${RISK_COLORS[b.peak_risk_level]}88)`,
                          boxShadow: isHovered || isPeak
                            ? `0 0 12px ${RISK_GLOW[b.peak_risk_level]}`
                            : 'none',
                        }}
                      />
                    </div>
                    <div className="forecast-bar-label">
                      {i % 3 === 0 ? formatHourLabel(i) : ''}
                    </div>

                    {/* Tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          className="forecast-tooltip"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                        >
                          <div className="forecast-tooltip-header">
                            <Clock size={10} />
                            <span>{formatHourLabel(i)}</span>
                            <span className="forecast-tooltip-risk" style={{ color: RISK_COLORS[b.peak_risk_level] }}>
                              {b.peak_risk_level}
                            </span>
                          </div>
                          <div className="forecast-tooltip-row">
                            <span>Risk Score</span>
                            <span style={{ color: RISK_COLORS[b.peak_risk_level] }}>{b.peak_risk_score}</span>
                          </div>
                          <div className="forecast-tooltip-row">
                            <span>Events</span>
                            <span>{b.event_count}</span>
                          </div>
                          {b.closest_approach_km && (
                            <div className="forecast-tooltip-row">
                              <span>Closest</span>
                              <span>{b.closest_approach_km < 1 ? `${(b.closest_approach_km * 1000).toFixed(0)}m` : `${b.closest_approach_km.toFixed(1)}km`}</span>
                            </div>
                          )}
                          {b.closest_pair && (
                            <div className="forecast-tooltip-pair">
                              {b.closest_pair.sat1_name?.substring(0, 12)} ↔ {b.closest_pair.sat2_name?.substring(0, 12)}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* NOW marker */}
              <div className="forecast-now-marker">
                <div className="forecast-now-line" />
                <span className="forecast-now-label">NOW</span>
              </div>
            </div>

            {/* ── Peak Alert Card ─────────────── */}
            {peakBucket.peak_risk_score > 0 && (
              <motion.div
                className={`forecast-peak-card ${peakBucket.peak_risk_level.toLowerCase()}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="forecast-peak-header">
                  <AlertTriangle size={14} />
                  <span>PEAK RISK HOUR</span>
                  <span className="forecast-peak-time">T+{peak_hour}h</span>
                </div>
                <div className="forecast-peak-body">
                  <div className="forecast-peak-score" style={{ color: RISK_COLORS[peakBucket.peak_risk_level] }}>
                    {peakBucket.peak_risk_score}
                  </div>
                  <div className="forecast-peak-details">
                    {peakBucket.closest_pair && (
                      <>
                        <div className="forecast-peak-pair">
                          {peakBucket.closest_pair.sat1_name} ↔ {peakBucket.closest_pair.sat2_name}
                        </div>
                        <div className="forecast-peak-dist">
                          {peakBucket.closest_approach_km < 1
                            ? `${(peakBucket.closest_approach_km * 1000).toFixed(0)} m`
                            : `${peakBucket.closest_approach_km.toFixed(2)} km`
                          } closest approach
                        </div>
                      </>
                    )}
                    <div className="forecast-peak-events">
                      {peakBucket.event_count} conjunction event{peakBucket.event_count !== 1 ? 's' : ''} in this window
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Summary Stats ───────────────── */}
            {summary && (
              <div className="forecast-stats">
                <div className="forecast-stat">
                  <div className="forecast-stat-value" style={{ color: '#ef4444' }}>{summary.hours_high_risk}</div>
                  <div className="forecast-stat-label">HRS HIGH</div>
                </div>
                <div className="forecast-stat">
                  <div className="forecast-stat-value" style={{ color: '#f59e0b' }}>{summary.hours_medium_risk}</div>
                  <div className="forecast-stat-label">HRS MED</div>
                </div>
                <div className="forecast-stat">
                  <div className="forecast-stat-value" style={{ color: '#22c55e' }}>{summary.hours_clear}</div>
                  <div className="forecast-stat-label">HRS CLEAR</div>
                </div>
                <div className="forecast-stat">
                  <div className="forecast-stat-value accent">{summary.unique_conjunction_pairs}</div>
                  <div className="forecast-stat-label">PAIRS</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
