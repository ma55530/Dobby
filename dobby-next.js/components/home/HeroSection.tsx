import Image from "next/image";
import { Play } from "lucide-react";

export function HeroSection() {
  const heroImage = "/assets/cinema.jpg";

  return (
    <section className="relative w-full h-[80vh] flex items-center justify-center text-center text-white mt-0">
      <Image
        src={heroImage}
        alt="Cinema"
        fill
        priority
        className="object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="relative z-10 px-6">
        <h1 className="text-6xl md:text-7xl font-extrabold drop-shadow-[0_4px_30px_rgba(147,51,234,0.6)]">
          Discover. Review. Share.
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mt-4 mb-8">
          Your ultimate social platform for movies and TV shows
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="btn-primary flex items-center gap-2">
            <Play className="w-5 h-5 fill-current" /> Get Started
          </button>
          <button className="border border-gray-500 text-gray-200 rounded-md px-6 py-2 hover:bg-gray-800 transition">
            Explore Trending
          </button>
        </div>
      </div>
    </section>
  );
}