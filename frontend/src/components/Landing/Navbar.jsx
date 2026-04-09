import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 3 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4"
    >
      <div className={`
        inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-all duration-500
        ${scrolled ? 'shadow-md shadow-black/10' : ''}
      `}>
        {/* Logo */}
        <div className="group relative w-9 h-9 flex items-center justify-center rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110">
          <div className="absolute inset-0 accent-gradient group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
          <div className="absolute inset-[1px] bg-bg rounded-full flex items-center justify-center">
            <span className="font-display italic text-[13px] text-text-primary tracking-tighter">JA</span>
          </div>
        </div>

        <div className="hidden md:block w-px h-5 bg-stroke mx-1 opacity-50" />

        <div className="flex items-center gap-1">
          {["Home", "Work", "Resume"].map((item) => (
            <button 
              key={item}
              className={`
                text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-all
                ${item === 'Home' ? 'text-text-primary bg-stroke/50' : 'text-muted hover:text-text-primary hover:bg-stroke/50'}
              `}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-stroke mx-1 opacity-50" />

        {/* "Say hi" button */}
        <div className="relative group overflow-hidden rounded-full">
          <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Link 
            to="/dashboard"
            className="relative block bg-surface rounded-full backdrop-blur-md px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-text-primary font-medium transition-transform active:scale-95"
          >
            Say hi <span className="ml-1 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform inline-block">↗</span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
