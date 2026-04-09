import { motion } from 'framer-motion';

const journalEntries = [
  {
    title: "The Future of Autonomous Space Habitats",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=200",
    readTime: "6 min read",
    date: "March 24, 2026"
  },
  {
    title: "Quantum Encryption in Satellite Networks",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200",
    readTime: "4 min read",
    date: "March 12, 2026"
  },
  {
    title: "Deep Space Logistics: A New Frontier",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=200",
    readTime: "8 min read",
    date: "February 28, 2026"
  },
  {
    title: "Ethical AI in High-Risk Orbital Decisions",
    image: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=200",
    readTime: "5 min read",
    date: "February 15, 2026"
  }
];

export default function Journal() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Journal</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-display leading-[1.1]">
              Recent <span className="italic">thoughts</span>
            </h2>
          </div>
          <button className="hidden md:inline-flex items-center gap-2 text-sm font-medium group transition-all">
            <span className="relative py-2 px-6 rounded-full border border-stroke group-hover:border-transparent overflow-hidden">
              <div className="absolute inset-0 accent-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 group-hover:text-bg transition-colors">View all</span>
            </span>
          </button>
        </motion.div>

        <div className="flex flex-col gap-4">
          {journalEntries.map((entry, idx) => (
            <motion.div
              key={entry.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="flex items-center gap-6 p-4 bg-surface/30 hover:bg-surface border border-stroke rounded-[40px] sm:rounded-full group cursor-pointer transition-all"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0 border border-stroke">
                <img src={entry.image} alt={entry.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-4">
                <h3 className="text-sm sm:text-lg font-medium text-text-primary group-hover:text-color-primary-light transition-colors">{entry.title}</h3>
                <div className="flex items-center gap-4 text-[10px] sm:text-xs text-muted font-mono uppercase tracking-wider">
                  <span>{entry.readTime}</span>
                  <span className="w-1 h-1 rounded-full bg-stroke" />
                  <span>{entry.date}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
