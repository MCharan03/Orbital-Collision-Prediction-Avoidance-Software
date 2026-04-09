/**
 * Orbix API Client
 * Centralized API communication with the Flask backend.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Retry with exponential backoff for transient failures ────
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || config.__retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }
    // Only retry on network errors or 5xx server errors
    const status = error.response?.status;
    if (!status || status >= 500) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delay = RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1);
      await new Promise(r => setTimeout(r, delay));
      return api(config);
    }
    return Promise.reject(error);
  }
);

// ── Satellites ──────────────────────────────────────────
export const fetchSatellites = (group = 'stations') =>
  api.get(`/satellites?group=${group}`).then(r => r.data);

export const refreshSatellites = (group = 'stations') =>
  api.post('/satellites/fetch', { group }).then(r => r.data);

export const fetchGroups = () =>
  api.get('/satellites/groups').then(r => r.data);

// ── Positions ───────────────────────────────────────────
export const fetchPositions = (group = 'stations', time = null) => {
  let url = `/positions?group=${group}`;
  if (time) url += `&time=${time}`;
  return api.get(url).then(r => r.data);
};

export const fetchTrail = (noradId, group = 'stations', duration = 90) =>
  api.get(`/positions/${noradId}/trail?group=${group}&duration=${duration}`).then(r => r.data);

export const fetchTimeseries = (group = 'stations', hours = 2, step = 300) =>
  api.get(`/positions/timeseries?group=${group}&hours=${hours}&step=${step}`).then(r => r.data);

// ── Collisions ──────────────────────────────────────────
export const fetchCollisions = (group = 'stations', threshold = 500, time = null) => {
  let url = `/collisions?group=${group}&threshold=${threshold}`;
  if (time) url += `&time=${time}`;
  return api.get(url).then(r => r.data);
};

export const predictCollisions = (group = 'stations', hours = 6, step = 120) =>
  api.get(`/collisions/predict?group=${group}&hours=${hours}&step=${step}`).then(r => r.data);

export const simulateManeuver = (satNoradId, targetNoradId, deltaHKm, group = 'stations') =>
  api.post('/maneuver/simulate', {
    sat_norad_id: satNoradId,
    target_norad_id: targetNoradId,
    delta_h_km: deltaHKm,
    group: group
  }).then(r => r.data);

export const recommendManeuver = (satNoradId, targetNoradId, group = 'stations') =>
  api.post('/maneuver/recommend', {
    sat_norad_id: satNoradId,
    target_norad_id: targetNoradId,
    group: group
  }).then(r => r.data);

export const fetchAutoResolutions = (group = 'stations') =>
  api.get(`/resolver/auto-resolve?group=${group}`).then(r => r.data);

// ── Risk ────────────────────────────────────────────────
export const fetchRisk = (group = 'stations', threshold = 500) =>
  api.get(`/risk?group=${group}&threshold=${threshold}`).then(r => r.data);

// ── Dashboard (aggregate) ───────────────────────────────
export const fetchDashboard = (group = 'stations', threshold = 500, time = null) => {
  let url = `/dashboard?group=${group}&threshold=${threshold}`;
  if (time) url += `&time=${time}`;
  return api.get(url).then(r => r.data);
};

export const fetchMLRisk = (group = 'stations', hours = 24) => 
  api.get(`/ml-risk?group=${group}&hours=${hours}`).then(r => r.data);

// ── Forecast (24h Predictive) ───────────────────────────────
export const fetchForecast = (group = 'stations', step = 120) =>
  api.get(`/forecast?group=${group}&step=${step}`, { timeout: 120000 }).then(r => r.data);


// ── Health ──────────────────────────────────────────────
export const checkHealth = () =>
  api.get('/health').then(r => r.data);

// ── Space News Feed ─────────────────────────────────────
export const fetchSpaceFeed = async () => {
  return api.get(`/space-feed`).then(r => r.data);
};

// ── ASWAN — Space Weather Adaptive Network ──────────────
export const fetchSpaceWeather = (group = 'stations', time = null) => {
  let url = `/aswan/weather?group=${group}`;
  if (time) url += `&time=${time}`;
  return api.get(url).then(r => r.data);
};

export const fetchNetworkStatus = (group = 'stations', time = null) => {
  let url = `/aswan/network?group=${group}`;
  if (time) url += `&time=${time}`;
  return api.get(url).then(r => r.data);
};

export const fetchSustainability = (group = 'stations', years = 10) =>
  api.get(`/aswan/sustainability?group=${group}&years=${years}`).then(r => r.data);

export const fetchASWANStatus = (group = 'stations') =>
  api.get(`/aswan/status?group=${group}`).then(r => r.data);

// ── Traffic Manager AI ──────────────────────────────────
export const queryTrafficManager = (query, context) =>
  api.post('/traffic-manager/query', { query, context }).then(r => r.data);

export const fetchManeuvers = (noradId) =>
  api.get(`/maneuvers?norad_id=${noradId}`).then(r => r.data);

export const runCascadeSimulation = (noradId) =>
  api.get(`/cascade?norad_id=${noradId}`).then(r => r.data);

export default api;
