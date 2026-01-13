"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, TrendingUp, Star } from "lucide-react";
import { recentReviews } from "@/data/mockData";
import TrendingMovies from '@/components/trending/TrendingMovies';
import { useEffect, useState } from "react";

export default function AuthenticatedHomePage() {
  const heroImage = "/assets/cinema.jpg";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user");
        
        // Check if response is JSON before parsing
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          setIsAuthenticated(false);
          return;
        }
        
        const data = await res.json();
        // If we got valid user data, we're authenticated
        if (data && data.id) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">

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
            {isAuthenticated ? "Welcome Back!" : "Discover. Review. Share."}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mt-4 mb-8">
            {isAuthenticated 
              ? "Discover what's trending and share your thoughts"
              : "Your ultimate social platform for movies and TV shows"
            }
          </p>
          {!isAuthenticated && isAuthenticated !== null && (
            <Link href="/auth/login">
              <button className="btn-primary flex items-center gap-3 mx-auto text-lg px-10 py-4">
                <Play className="w-6 h-6 fill-current" /> Get Started
              </button>
            </Link>
          )}
        </div>
      </section>

      {/* Trending */}
      <section className="w-full py-8 px-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-8 h-8 text-purple-400" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">Trending Now</h2>
        </div>
        <TrendingMovies />
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
            Share Your Thoughts
          </h2>
          <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed">
            Connect with fellow movie and TV shows enthusiasts, share your thoughts, and discover your next favorite film or TV show together.
          </p>
        </div>
      </section>

      
    </main>
  );
}
