"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { RecentReviewsSection } from "@/components/home/RecentReviewsSection";
import { JoinCommunitySection } from "@/components/home/JoinCommunitySection";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">
      <HeroSection/>
      <TrendingSection/>
      <RecentReviewsSection/>
      <JoinCommunitySection/>
      <Footer/>
    </main>
  );
}