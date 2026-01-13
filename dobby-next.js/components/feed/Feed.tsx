"use client";

import { useEffect, useState } from "react";
import Post from "./Post";

interface Review {
  id: number;
  author: string;
  avatar?: string;
  rating: number;
  content: string;
  date: string;
  likes: number;
  movieId?: number;
  movieTitle?: string;
  movieType?: "movie" | "tv";
  moviePoster?: string;
}

export default function Feed() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews");
        if (!response.ok) throw new Error("Failed to fetch reviews");
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  return (
    <div className="w-full">
      {/* Feed Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Community Activity</h2>
        <p className="text-gray-400">See what others are watching and reviewing</p>
      </div>

      {/* Feed Posts */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading reviews...</div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((post) => (
            <Post key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8">No reviews yet</div>
      )}
    </div>
  );
}
