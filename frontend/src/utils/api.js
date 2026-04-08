/**
 * Forge-X API Client
 * Centralized API communication with the Flask backend.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

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

// ── Health ──────────────────────────────────────────────
export const checkHealth = () =>
  api.get('/health').then(r => r.data);

// ── Space News Feed ─────────────────────────────────────
export const fetchSpaceFeed = async () => {
  return api.get(`/space-feed`).then(r => r.data);
};

export default api;
