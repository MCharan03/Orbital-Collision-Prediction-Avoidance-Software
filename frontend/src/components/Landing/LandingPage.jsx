import { useState } from 'react';
import LoadingScreen from './LoadingScreen';
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import Journal from './Journal';
import Explorations from './Explorations';
import Stats from './Stats';
import Footer from './Footer';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative bg-bg min-h-screen selection:bg-accent selection:text-bg">
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      
      {!isLoading && (
        <div className="animate-in fade-in duration-1000 fill-mode-both">
          <Navbar />
          <main>
            <Hero />
            <Features />
            <Journal />
            <Explorations />
            <Stats />
          </main>
          <Footer />
        </div>
      )}
    </div>
  );
}
