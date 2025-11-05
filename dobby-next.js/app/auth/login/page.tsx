"use client";

import Image from "next/image";
import AuthTabs from '@/components/auth/auth-tabs'

export default function Page() {
  const heroImage = "/assets/cinema.jpg";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a1625] to-[#0f0c18]">
      <section className="relative h-screen flex items-center">
        <Image 
          src={heroImage} 
          alt="Cinema" 
          fill 
          priority 
          className="object-cover opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        
        <div className="relative z-10 flex w-full max-w-7xl mx-auto px-6">
          
          <div className="w-1/2 flex flex-col justify-start ">
            <h1 className="text-6xl font-bold text-white">
              Discover.<br />Review.<br />Share.
            </h1>
            <p className="text-xl text-gray-300 mt-4">
              Your ultimate social platform for movies and TV shows
            </p>
          </div>
          
          
          <div className="w-1/2 flex justify-center items-start">
            <div className="w-full max-w-md">
              <AuthTabs />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-6 text-center text-gray-400 w-full">
        © 2025 Dobby. Your social network for cinema.
      </footer>

    </main>
  );
}
