import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const explorationItems = [
  { id: 1, image: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&q=80&w=600", rotation: -5, yOffset: 0 },
  { id: 2, image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=600", rotation: 8, yOffset: 100 },
  { id: 3, image: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=600", rotation: -12, yOffset: -50 },
  { id: 4, image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=600", rotation: 5, yOffset: 150 },
  { id: 5, image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600", rotation: -8, yOffset: 50 },
  { id: 6, image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600", rotation: 10, yOffset: -100 }
];

export default function Explorations() {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pin the center content
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false
      });

      // Parallax effect for items
      explorationItems.forEach((item, i) => {
        gsap.to(`.para-item-${i}`, {
          y: -300 - (item.yOffset || 0),
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1
          }
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-[300vh] bg-bg overflow-hidden">
      {/* Pinned Center Content */}
      <div ref={contentRef} className="absolute inset-0 h-screen flex flex-col items-center justify-center z-10 pointer-events-none">
        <div className="text-center px-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Explorations</span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-6xl md:text-8xl font-display leading-tight mb-8">
            Visual <span className="italic">playground</span>
          </h2>
          <p className="text-muted max-w-sm mx-auto text-sm md:text-base leading-relaxed mb-12">
            Experimental interfaces and deep space research visualizations.
          </p>
          <button className="pointer-events-auto px-8 py-3 rounded-full border border-stroke hover:bg-surface transition-colors text-sm font-medium">
            Explore Dribbble
          </button>
        </div>
      </div>

      {/* Parallax Grid */}
      <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-2 gap-12 md:gap-40 pt-32 pb-[100vh]">
        {explorationItems.map((item, i) => (
          <div 
            key={item.id} 
            className={`para-item-${i} relative aspect-square max-w-[320px] rounded-2xl overflow-hidden border border-stroke cursor-zoom-in bg-surface`}
            style={{ 
              transform: `rotate(${item.rotation}deg)`,
              marginTop: i % 2 === 0 ? '0' : '200px'
            }}
          >
            <img 
              src={item.image} 
              alt="Exploration" 
              className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" 
            />
            <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
          </div>
        ))}
      </div>
    </section>
  );
}
