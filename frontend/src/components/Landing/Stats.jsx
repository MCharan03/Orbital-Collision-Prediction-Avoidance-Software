import { motion } from 'framer-motion';

const stats = [
  { label: "Active Operations", val: "450+" },
  { label: "Resolved Conjunctions", val: "12.4k" },
  { label: "Data Uptime", val: "99.9%" }
];

export default function Stats() {
  return (
    <section className="bg-bg py-16 md:py-24 border-y border-stroke">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center md:text-left"
            >
              <div className="text-5xl md:text-7xl font-display italic text-text-primary mb-2">{stat.val}</div>
              <div className="text-xs text-muted uppercase tracking-[0.2em]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
