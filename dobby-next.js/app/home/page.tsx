"use client";

import CreateReview from "@/components/feed/CreateReview";
import Feed from "@/components/feed/Feed";
import LatestRatings from "@/components/cards/LatestRatings";
import { List, Users, MessageSquare, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a1625] via-[#0f0c18] to-[#1a1625] text-white">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 backdrop-blur-sm border-b border-purple-700/30 top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          <div className="text-center w-full">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Welcome to Dobby
            </h1>
            <p className="text-gray-300 text-lg">Discover, share, and celebrate movies and shows with our community</p>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="w-full max-w-8xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 lg:gap-20">
          
          {/* Left Sidebar - Quick Actions (on mobile: top-left, on desktop: left column) */}
          <div className="md:col-span-4 lg:col-span-2 md:order-1">
            <div className="md:sticky md:top-20 space-y-4">
              
              {/* Feed Filter Toggle */}
              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4">
                <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Feed Filter</h3>
                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={() => router.push("/home")}
                    className="flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium whitespace-nowrap flex-1 md:flex-none bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                  >
                    <Users size={16} className="flex-shrink-0" />
                    <span className="truncate">Public</span>
                  </button>
                  <button
                    onClick={() => router.push("/home/following")}
                    className="flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium whitespace-nowrap flex-1 md:flex-none bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50"
                  >
                    <UserCheck size={16} className="flex-shrink-0" />
                    <span className="truncate">Following</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4">
                <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={() => router.push("/watchlist")}
                    className="flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-gray-300 hover:bg-purple-600/50 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-1 md:flex-none"
                  >
                    <List size={16} className="flex-shrink-0" />
                    <span className="truncate">My Watchlists</span>
                  </button>
                  <button
                    onClick={() => router.push("/messages")}
                    className="flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-gray-300 hover:bg-purple-600/50 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-1 md:flex-none"
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <span className="truncate">Messages</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Content - CreateReview + Feed */}
          <div className="md:col-span-8 lg:col-span-7 md:order-2 space-y-10">
            {/* Create Review Section */}
            <CreateReview />
            
            {/* Community Activity Feed */}
            <Feed type="reviews" filter="public" />
          </div>

          {/* Right Sidebar - Latest Ratings */}
          <div className="md:col-span-12 lg:col-span-3 md:order-3">
            <div className="lg:sticky lg:top-20">
              <LatestRatings />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
