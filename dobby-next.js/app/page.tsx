"use client";

import Image from "next/image";
import { Play, TrendingUp, Star } from "lucide-react";
import { trendingMovies, recentReviews } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import NavbarWrapper from "@/components/navbar/NavbarWrapper";

export default function HomePage() {
  const heroImage = "/assets/cinema.jpg";

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">

      {/* Navbar */} 
      {/* already included in the layout */}

      {/* Hero Image */}
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

      {/* Trending */}
      <section className="w-full py-16 px-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-8 h-8 text-purple-400" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Trending Now
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {trendingMovies.map((movie) => (
            <div
              key={movie.id}
              className="relative group overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all duration-300"
            >
              <Image
                src={movie.poster}
                alt={movie.title}
                width={400}
                height={600}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                <h3 className="text-lg font-bold line-clamp-1">{movie.title}</h3>
                <p className="text-sm text-gray-300">{movie.year}</p>
                <p className="text-sm text-yellow-400 font-semibold">
                  ★ {movie.rating.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Reviews */}
      <section className="w-full py-16 bg-zinc-900/50 px-6 max-w-6xl rounded-xl">
        <div className="flex items-center gap-3 mb-8">
          <Star className="w-8 h-8 text-yellow-400" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Recent Reviews
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReviews.map((review) => (
            <div
              key={review.id}
              className="p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 hover:border-yellow-400/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">{review.author}</h4>
                <span className="text-yellow-400 font-bold">★ {review.rating}</span>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{review.content}</p>
              <div className="flex items-center justify-between text-gray-500 text-xs">
                <span>{review.date}</span>
                <span>👍 {review.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Join the Community */}
      <section className="w-full py-24 text-center px-6 mt-10 bg-transparent">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Join the Community
          </h2>
          <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed">
            Connect with fellow movie and TV shows enthusiasts, share your thoughts, and discover your next favorite film or TV show together.
          </p>
          <button className="bg-[#f5a623] hover:bg-[#ffb947] text-black font-semibold px-8 py-3 rounded-md transition duration-300 shadow-none hover:shadow-[0_0_20px_rgba(255,185,71,0.4)]">
            Sign Up
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-gray-400 w-full">
        © 2025 Dobby. Your social network for cinema.
      </footer>
    </main>
  );
}
