import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, Search } from 'lucide-react';

/**
 * Sidebar.jsx — Glassmorphic satellite list with search.
 */
export default function Sidebar({ positions, selectedSatId, onSelectSatellite }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!positions) return [];
    if (!search) return positions;
    const q = search.toLowerCase();
    return positions.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.norad_id).includes(q)
    );
  }, [positions, search]);

  return (
    <>
      <div className="sidebar-section">
        <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Satellite size={16} /> SATELLITES ({positions?.length || 0})</div>
        <input
          type="text"
          className="sidebar-search"
          placeholder="Search by name or NORAD ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="satellite-list">
        <AnimatePresence>
          {filtered.map(sat => (
            <motion.div
              key={sat.norad_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className={`sat-card ${selectedSatId === sat.norad_id ? 'active' : ''}`}
              onClick={() => onSelectSatellite?.(sat)}
            >
              <div className="sat-card-header">
                <span className="sat-card-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Satellite size={14} color="rgba(255, 255, 255, 0.7)" />
                  {sat.name}
                </span>
                <span className={`risk-badge ${(sat.risk_level || 'low').toLowerCase()}`}>
                  {sat.risk_level || 'LOW'}
                </span>
              </div>
              <div className="sat-card-details">
                <span className="sat-card-detail">
                  ID: <strong>{sat.norad_id}</strong>
                </span>
                <span className="sat-card-detail">
                  Alt: <strong>{sat.alt?.toFixed(0) || '—'} km</strong>
                </span>
                <span className="sat-card-detail coords">
                  {sat.lat?.toFixed(1)}°, {sat.lon?.toFixed(1)}°
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div 
            className="empty-state"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="empty-state-icon"><Search size={24} /></div>
            <div className="empty-state-text">NO ORBITAL DATA MATCHED</div>
          </motion.div>
        )}
      </div>
    </>
  );
}
