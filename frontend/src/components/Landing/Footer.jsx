import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';

export default function Footer() {
  const videoRef = useRef(null);
  const marqueeRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hlsUrl = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    }

    // GSAP Marquee
    if (marqueeRef.current) {
      gsap.to(marqueeRef.current, {
        xPercent: -50,
        duration: 40,
        ease: "none",
        repeat: -1
      });
    }
  }, []);

  return (
    <footer className="relative bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden">
      {/* Background Video (Flipped Vertically) */}
      <div className="absolute inset-0 z-0 scale-y-[-1]">
        <video 
          ref={videoRef}
          autoPlay muted loop playsInline 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10">
        {/* Marquee */}
        <div className="py-12 border-y border-stroke overflow-hidden whitespace-nowrap mb-24 md:mb-32">
          <div ref={marqueeRef} className="inline-block">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-6xl md:text-9xl font-display uppercase italic text-stroke/30 mx-8">
                BUILDING THE FUTURE • 
              </span>
            ))}
          </div>
        </div>

        {/* CTA Area */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 text-center mb-32">
          <motion.a 
            href="mailto:hello@orbix.space"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="group relative inline-flex items-center justify-center p-[2px] rounded-full overflow-hidden"
          >
            <div className="absolute inset-0 accent-gradient group-hover:scale-110 transition-transform duration-500" />
            <div className="relative bg-bg px-12 py-6 rounded-full transition-colors group-hover:bg-transparent">
              <span className="text-2xl md:text-4xl font-display italic text-text-primary group-hover:text-bg transition-colors">
                hello@orbix.space
              </span>
            </div>
          </motion.a>
        </div>

        {/* Footer Bar */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-muted uppercase tracking-[0.2em] font-medium">
          <div className="flex gap-8">
            <a href="#" className="hover:text-text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-text-primary transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-text-primary transition-colors">Dribbble</a>
            <a href="#" className="hover:text-text-primary transition-colors">GitHub</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-color-safe" />
              <div className="absolute w-2 h-2 rounded-full bg-color-safe animate-ping" />
            </div>
            <span>Available for projects</span>
          </div>

          <div>© 2026 ORBIX</div>
        </div>
      </div>
    </footer>
  );
}
