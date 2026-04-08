import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import SpaceFeed from './components/Feed/SpaceFeed';

export default function App() {
  const location = useLocation();

  return (
    <>
      {/* Global Navigation Overlay */}
      <div className="global-nav glass-panel">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <span className="icon">🌐</span> <span className="label">Dashboard</span>
        </Link>
        <div className="nav-divider"></div>
        <Link to="/space-feed" className={`nav-item ${location.pathname === '/space-feed' ? 'active' : ''}`}>
          <span className="icon">📡</span> <span className="label">Intelligence Feed</span>
        </Link>
      </div>

      <div className="app-content-wrapper">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/space-feed" element={<SpaceFeed />} />
        </Routes>
      </div>
    </>
  );
}
