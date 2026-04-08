/**
 * Constants — Colors, Earth parameters, and configuration.
 */

// Earth
export const EARTH_RADIUS = 1; // Normalized radius for Three.js
export const EARTH_RADIUS_KM = 6371;

// Risk colors
export const RISK_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  NONE: '#64748b',
};

// Risk glow intensity
export const RISK_GLOW = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 1.0,
  NONE: 0.1,
};

// Satellite groups for selector
export const SATELLITE_GROUPS = [
  { id: 'stations', name: 'Space Stations' },
  { id: 'active', name: 'Active Satellites' },
  { id: 'starlink', name: 'Starlink' },
  { id: 'gps-ops', name: 'GPS Operational' },
  { id: 'galileo', name: 'Galileo' },
  { id: 'weather', name: 'Weather' },
  { id: 'science', name: 'Science' },
  { id: 'resource', name: 'Earth Resources' },
  { id: 'last-30-days', name: 'Last 30 Days' },
  { id: 'geo', name: 'Geostationary' },
];

// Time slider config
export const TIME_SLIDER = {
  MIN_OFFSET_HOURS: 0,
  MAX_OFFSET_HOURS: 24,
  STEP_MINUTES: 5,
  DEFAULT_SPEED: 1, // 1x realtime
};
