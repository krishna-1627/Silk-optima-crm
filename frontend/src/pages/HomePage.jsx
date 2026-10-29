import React from 'react';
import LandingHero from '../components/landing/LandingHero';
import FeatureCards from '../components/landing/FeatureCards';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8fafd] font-sans flex flex-col relative selection:bg-[#0052cc] selection:text-white">
      
      {/* Hero Section */}
      <LandingHero />

      {/* Feature Cards - Flow normally, pulled up on desktop with negative margin (-mt-24) to prevent overlap issues */}
      <div className="relative z-20 w-full max-w-full mx-auto mt-8 lg:-mt-24 px-4 sm:px-6 lg:px-8 pb-12 lg:max-w-7xl">
        <FeatureCards />
      </div>

    </div>
  );
}