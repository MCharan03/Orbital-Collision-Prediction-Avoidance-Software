import { motion } from 'framer-motion';

const projects = [
  {
    title: "Automotive Motion",
    description: "High-performance interface for next-gen electric vehicles.",
    span: "md:col-span-7",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000",
    ratio: "aspect-[1.4/1]"
  },
  {
    title: "Urban Architecture",
    description: "Generative design tools for sustainable city planning.",
    span: "md:col-span-5",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000",
    ratio: "aspect-[1/1.2]"
  },
  {
    title: "Human Perspective",
    description: "Empathetic design for modern communication platforms.",
    span: "md:col-span-5",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1000",
    ratio: "aspect-[1/1.2]"
  },
  {
    title: "Brand Identity",
    description: "Scalable design systems for global enterprise brands.",
    span: "md:col-span-7",
    image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1000",
    ratio: "aspect-[1.4/1]"
  }
];

export default function Features() {
  return (
    <section className="bg-bg py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-24"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Selected Work</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-display leading-[1.1]">
              Featured <span className="italic">projects</span>
            </h2>
          </div>
          <div className="flex flex-col gap-6 md:items-end">
            <p className="text-muted max-w-sm text-sm md:text-base leading-relaxed">
              A selection of projects I've worked on, from concept to launch.
            </p>
            <button className="hidden md:inline-flex items-center gap-2 text-sm font-medium group transition-all">
              <span className="relative py-2 px-6 rounded-full border border-stroke group-hover:border-transparent overflow-hidden">
                <div className="absolute inset-0 accent-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 group-hover:text-bg transition-colors">View all work</span>
              </span>
              <div className="w-10 h-10 rounded-full border border-stroke flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-lg">→</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {projects.map((project, idx) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`${project.span} group relative ${project.ratio} bg-surface border border-stroke rounded-[2rem] overflow-hidden cursor-pointer`}
            >
              {/* Background Image */}
              <img 
                src={project.image} 
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Halftone Overlay */}
              <div className="absolute inset-0 halftone opacity-20 mix-blend-multiply" />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-bg/70 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                <div className="relative overflow-hidden rounded-full p-[1px]">
                  <div className="absolute inset-0 animate-gradient-shift accent-gradient" />
                  <div className="relative bg-white px-6 py-2 rounded-full">
                    <span className="text-black text-sm font-medium">
                      View — <span className="font-display italic font-semibold">{project.title}</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
