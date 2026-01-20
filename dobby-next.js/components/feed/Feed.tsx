"use client";

import { useEffect, useState } from "react";
import Post from "./Post";
import RatingCard from "@/components/cards/RatingCard";

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  rating?: number;
  content: string;
  date: string;
  likes: number;
  parentId?: string;
  hasChildren?: boolean;
  children?: Comment[];
  userId?: string;
}

interface Review {
  id: string;
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
  commentCount?: number;
  userId?: string;
}

export default function Feed({ 
  type = "reviews", 
  filter = "public" 
}: { 
  type?: "reviews" | "ratings";
  filter?: "public" | "following";
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [nestedComments, setNestedComments] = useState<Record<string, Comment[]>>({});

  // Recursive function to fetch all nested replies
  const fetchRepliesRecursive = async (commentId: string): Promise<Comment[]> => {
    try {
      const repliesResponse = await fetch(`/api/comments/${commentId}/replies`);
      if (!repliesResponse.ok) return [];
      
      const repliesResult = await repliesResponse.json();
      const rawReplies = repliesResult.replies || [];
      
      // Recursively fetch replies for each reply
      const replies = await Promise.all(rawReplies.map(async (reply: Record<string, unknown>) => {
        let nestedReplies: Comment[] = [];
        if (((reply.reply_count as number) || 0) > 0) {
          nestedReplies = await fetchRepliesRecursive(reply.id as string);
        }
        
        return {
          id: reply.id as string,
          author: (reply.profiles as Record<string, unknown>)?.username as string || 'Unknown',
          avatar: (reply.profiles as Record<string, unknown>)?.avatar_url as string,
          content: reply.comment_text as string,
          date: new Date(reply.created_at as string).toLocaleDateString(),
          likes: 0,
          parentId: reply.parent_comment as string,
          hasChildren: ((reply.reply_count as number) || 0) > 0,
          children: nestedReplies,
          userId: (reply.profiles as Record<string, unknown>)?.id as string
        };
      }));
      
      return replies;
    } catch (error) {
      console.error("Error fetching replies recursively:", error);
      return [];
    }
  };

  const loadMoreComments = async (parentId: string) => {
    try {
      const response = await fetch(`/api/posts/${parentId}/comments?limit=10&offset=0`);
      if (!response.ok) throw new Error("Failed to fetch children");
      const result = await response.json();
      const rawChildren = result.comments || result;
      
      // Transform the data to match the Comment interface and fetch all nested replies recursively
      const children = await Promise.all(rawChildren.map(async (comment: Record<string, unknown>) => {
        let replies: Comment[] = [];
        if (((comment.reply_count as number) || 0) > 0) {
          replies = await fetchRepliesRecursive(comment.id as string);
        }

        return {
          id: comment.id,
          author: (comment.profiles as Record<string, unknown>)?.username as string || 'Unknown',
          avatar: (comment.profiles as Record<string, unknown>)?.avatar_url as string,
          content: comment.comment_text,
          date: new Date(comment.created_at as string).toLocaleDateString(),
          likes: 0,
          hasChildren: ((comment.reply_count as number) || 0) > 0,
          parentId: comment.parent_comment,
          children: replies,
          userId: (comment.profiles as Record<string, unknown>)?.id as string
        };
      }));
      
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
        // Build query params
        const params = new URLSearchParams({
          limit: "20",
          offset: "0",
          ...(filter === "following" && { filter: "following" })
        });

        // Use different endpoints based on type
        const endpoint = type === "ratings" 
          ? `/api/ratings?${params}`
          : `/api/posts?${params}`;
        
        const response = await fetch(endpoint);
        const result = await response.json();
        
        // Handle errors gracefully - if user doesn't follow anyone, result will have empty array
        if (!response.ok) {
          console.error("Error fetching reviews:", result.error || "Unknown error");
          setReviews([]);
          return;
        }
        
        // Get data from appropriate property
        const data = type === "ratings" 
          ? (result.ratings || [])
          : (result.posts || []);
        
        setReviews(data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [type, filter]);

  // Hide header for ratings view
  const showHeader = type === "reviews";

  return (
    <div className="w-full">
      {/* Feed Header - Only for main reviews feed */}
      {showHeader && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
            {filter === "following" ? "Following Activity" : "Community Activity"}
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            {filter === "following" 
              ? "See what people you follow are watching and reviewing"
              : "See what others are watching and reviewing"}
          </p>
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
          {filter === "following" 
            ? (type === "ratings" 
                ? "No ratings from people you follow yet. Start following users to see their activity!" 
                : "No reviews from people you follow yet. Start following users to see their activity!")
            : (type === "ratings" ? "No ratings yet" : "No reviews yet")}
        </div>
      )}
    </div>
  );
}
