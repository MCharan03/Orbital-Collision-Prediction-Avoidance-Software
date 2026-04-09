import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import gsap from 'gsap';
import { Link } from 'react-router-dom';

const roles = ["Creative", "Fullstack", "Founder", "Scholar"];

export default function Hero() {
  const videoRef = useRef(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const containerRef = useRef(null);

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

    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % roles.length);
    }, 2000);

    // GSAP Entrance
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      
      tl.to('.name-reveal', {
        opacity: 1,
        y: 0,
        duration: 1.2,
        delay: 0.1
      })
      .to('.blur-in', {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        duration: 1,
        stagger: 0.1
      }, "-=0.8");
    }, containerRef);

    return () => {
      clearInterval(interval);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          loop 
          playsInline 
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2 opacity-40"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl">
        <div className="blur-in opacity-0 translate-y-5">
          <p className="text-xs text-muted uppercase tracking-[0.3em] mb-8">COLLECTION '26</p>
        </div>
        
        <h1 className="name-reveal opacity-0 translate-y-12 text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
          Michael Smith
        </h1>

        <div className="blur-in opacity-0 translate-y-5 h-8 mb-12">
          <p className="text-sm md:text-base text-muted">
            A{' '}
            <span key={roleIndex} className="font-display italic text-text-primary animate-role-fade-in inline-block">
              {roles[roleIndex]}
            </span>
            {' '}lives in Chicago.
          </p>
        </div>

        <div className="blur-in opacity-0 translate-y-5 max-w-md mx-auto mb-12">
          <p className="text-sm md:text-base text-muted leading-relaxed">
            Designing seamless digital interactions by focusing on the unique nuances which bring systems to life.
          </p>
        </div>

        <div className="blur-in opacity-0 translate-y-5 flex flex-wrap items-center justify-center gap-4">
          <Link 
            to="/dashboard"
            className="group relative bg-text-primary text-bg px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
          >
            <div className="absolute inset-[-1px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            <span className="relative group-hover:text-text-primary transition-colors">See Works</span>
          </Link>
          
          <button className="group relative border-2 border-stroke bg-bg text-text-primary px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:scale-105 hover:border-transparent">
            <div className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            Reach out...
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <span className="text-[10px] text-muted uppercase tracking-[0.2em]">Scroll</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
