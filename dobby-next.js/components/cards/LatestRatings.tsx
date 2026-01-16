"use client";

import { useEffect, useState } from "react";
import RatingCard from "./RatingCard";

interface Rating {
  id: string;
  rating: number;
  author: string;
  avatar?: string;
  movieTitle?: string;
  moviePoster?: string;
  movieType?: "movie" | "tv";
  date: string;
}

export default function LatestRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestRatings = async () => {
      try {
        const response = await fetch("/api/ratings?limit=5");
        if (!response.ok) throw new Error("Failed to fetch ratings");
        const data = await response.json();
        setRatings(data.ratings || []);
      } catch (error) {
        console.error("Error fetching latest ratings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestRatings();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Latest Ratings</h3>
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Latest Ratings</h3>
      <div className="space-y-3">
        {ratings.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4">
            <p className="text-zinc-500 text-sm">No recent ratings</p>
          </div>
        ) : (
          ratings.map((rating) => (
            <RatingCard key={rating.id} post={rating} />
          ))
        )}
      </div>
    </div>
  );
}
