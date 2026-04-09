import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './components/Landing/LandingPage';
import Dashboard from './components/Dashboard/Dashboard';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen">
            <LandingPage />
          </motion.div>
        } />
        <Route path="/dashboard" element={
          <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen">
            <Dashboard />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
