"use client";

import CreateReview from "@/components/feed/CreateReview";
import Feed from "@/components/feed/Feed";
import MessageButton from "@/components/messaging/MessageButton";

export default function AuthenticatedHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a1625] via-[#0f0c18] to-[#1a1625] text-white">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 backdrop-blur-sm border-b border-purple-700/30 top-0 z-40">
        <div className="w-full max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-center w-full">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Welcome to Dobby
              </h1>
              <p className="text-gray-300 text-lg">Discover, share, and celebrate movies and shows with our community</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center p-3 sm:p-4 md:p-9 py-8">
        <div className="w-full max-w-7xl">
          <div className="space-y-6">
            
            {/* Create Review - Top Section */}
            <div className="max-w-2xl mx-auto w-full mb-8">
              <CreateReview />
            </div>

            {/* Two Column Layout - Reviews and Ratings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-15">
              
              {/* Left Side - Main Feed (Reviews with text) */}
              <div className="lg:col-span-2">
                <Feed type="reviews" />
              </div>

              {/* Right Side - Ratings Only */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 lg:top-25">
                  <h3 className="text-xl font-bold text-white mb-4">Latest Ratings</h3>
                  <Feed type="ratings" />
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Floating messaging button */}
      <MessageButton />
    </main>
  );
}
