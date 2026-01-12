"use client";

import { useState } from "react";
import CreateReview from "@/components/feed/CreateReview";
import Feed from "@/components/feed/Feed";
import MessageButton from "@/components/messaging/MessageButton";
import { ChevronDown, Plus } from "lucide-react";

export default function HomePage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
        <div className="w-full px-4">
          <div className="space-y-6">
            
            {/* Collapsible Create Review Section */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsCreateOpen(!isCreateOpen)}
                className="w-full flex items-center justify-between bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-700/50 rounded-lg p-4 hover:from-purple-900/50 hover:to-pink-900/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Plus size={20} className="text-purple-400" />
                  <span className="font-semibold">Share Your Review</span>
                </div>
                <ChevronDown
                  size={20}
                  className={`transition-transform duration-300 ${isCreateOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isCreateOpen && (
                <div className="mt-4 animate-fadeIn">
                  <CreateReview />
                </div>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:grid grid-cols-4 gap-30">
              
              {/* Feed - Main Content */}
              <div className="col-span-3 flex items-center">
                <Feed />
              </div>

              {/* Right Sidebar - Create Review */}
              <div className="col-span-1">
                <div className="sticky top-32">
                  <CreateReview />
                </div>
              </div>

            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden">
              <Feed />
            </div>

          </div>
        </div>
      </div>

      {/* Floating messaging button */}
      <MessageButton />
    </main>
  );
}
