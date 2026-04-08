import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';

/**
 * AnimatedCounter internally animates a number from 0 to value.
 */
function AnimatedCounter({ to }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const controls = animate(value, to, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(v) {
        setValue(Math.round(v));
      }
    });
    return () => controls.stop();
  }, [to]);

  return <span>{value}</span>;
}

export default function StatsPanel({ satelliteCount, collisionSummary }) {
  const high = collisionSummary?.high_risk || 0;
  const medium = collisionSummary?.medium_risk || 0;
  const total = collisionSummary?.total_events || 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      className="stats-panel"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div className="stat-card" variants={itemVariants}>
        <div className="stat-value accent">
          <AnimatedCounter to={satelliteCount || 0} />
        </div>
        <div className="stat-label">TRACKED</div>
      </motion.div>

      <motion.div className="stat-card" variants={itemVariants}>
        <div className={`stat-value ${high > 0 ? 'danger' : 'safe'}`}>
          <AnimatedCounter to={high} />
        </div>
        <div className="stat-label">HIGH RISK</div>
      </motion.div>

      <motion.div className="stat-card" variants={itemVariants}>
        <div className={`stat-value ${medium > 0 ? 'warning' : 'safe'}`}>
          <AnimatedCounter to={medium} />
        </div>
        <div className="stat-label">MEDIUM</div>
      </motion.div>

      <motion.div className="stat-card" variants={itemVariants}>
        <div className="stat-value">
          <AnimatedCounter to={total} />
        </div>
        <div className="stat-label">EVENTS</div>
      </motion.div>
    </motion.div>
  );
}
