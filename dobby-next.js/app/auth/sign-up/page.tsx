"use client";

import Image from "next/image";
import AuthTabs from '@/components/auth/auth-tabs'

export default function Page() {
  const heroImage = "/assets/cinema.jpg";

  return (
    <main className="min-h-svh bg-gradient-to-b from-[#1a1625] to-[#0f0c18]">
      <section className="relative min-h-svh flex items-center py-10 md:py-0">
        <Image 
          src={heroImage} 
          alt="Cinema" 
          fill 
          sizes="100vw"
          priority 
          className="object-cover opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        
        <div className="relative z-10 flex w-full max-w-7xl mx-auto px-6 flex-col md:flex-row gap-10 md:gap-0">
          
          <div className="w-full md:w-1/2 flex flex-col justify-start text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
              Discover.<br />Review.<br />Share.
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mt-4 max-w-xl mx-auto md:mx-0">
              Your ultimate social platform for movies and TV shows
            </p>
          </div>
          
          
          <div className="w-full md:w-1/2 flex justify-center items-start">
            <div className="w-full max-w-md">
              <AuthTabs defaultTab="signup" />
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
