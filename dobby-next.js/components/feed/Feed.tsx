"use client";

import { useEffect, useState } from "react";
import Post from "./Post";
import RatingCard from "@/components/cards/RatingCard";

interface Comment {
  id: number;
  author: string;
  avatar?: string;
  rating: number;
  content: string;
  date: string;
  likes: number;
  parentId?: number;
}

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
  hasChildren?: boolean;
  children?: Comment[];
}

export default function Feed({ type = "reviews" }: { type?: "reviews" | "ratings" }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [nestedComments, setNestedComments] = useState<Record<number, Comment[]>>({});

  const loadMoreComments = async (parentId: number) => {
    try {
      const response = await fetch(`/api/reviews/${parentId}/children`);
      if (!response.ok) throw new Error("Failed to fetch children");
      const children = await response.json();
      
      setNestedComments(prev => ({
        ...prev,
        [parentId]: children
      }));
    } catch (error) {
      console.error("Error fetching children:", error);
    }
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews");
        if (!response.ok) throw new Error("Failed to fetch reviews");
        const data = await response.json();
        
        // Filter based on type
        let filtered = data;
        if (type === "reviews") {
          // Show only reviews with content
          filtered = data.filter((item: Review) => item.content && item.content.trim() !== "");
        } else if (type === "ratings") {
          // Show only ratings without content
          filtered = data.filter((item: Review) => !item.content || item.content.trim() === "");
        }
        
        setReviews(filtered);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [type]);

  // Hide header for ratings view
  const showHeader = type === "reviews";

  return (
    <div className="w-full">
      {/* Feed Header - Only for main reviews feed */}
      {showHeader && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Community Activity</h2>
          <p className="text-gray-400">See what others are watching and reviewing</p>
        </div>
      )}

      {/* Feed Posts */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : reviews.length > 0 ? (
        <div className="space-y-8">
          {reviews.map((post) => (
            type === "ratings" ? (
              <RatingCard key={post.id} post={post} />
            ) : (
              <Post 
                key={post.id} 
                post={post} 
                onLoadMore={loadMoreComments}
                nestedComments={nestedComments}
              />
            )
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8">
          {type === "ratings" ? "No ratings yet" : "No reviews yet"}
        </div>
      )}
    </div>
  );
}
