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
      const replies = await Promise.all(rawReplies.map(async (reply: any) => {
        let nestedReplies: Comment[] = [];
        if ((reply.reply_count || 0) > 0) {
          nestedReplies = await fetchRepliesRecursive(reply.id);
        }
        
        return {
          id: reply.id,
          author: reply.profiles?.username || 'Unknown',
          avatar: reply.profiles?.avatar_url,
          content: reply.comment_text,
          date: new Date(reply.created_at).toLocaleDateString(),
          likes: 0,
          parentId: reply.parent_comment,
          hasChildren: (reply.reply_count || 0) > 0,
          children: nestedReplies
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
      const children = await Promise.all(rawChildren.map(async (comment: any) => {
        let replies: Comment[] = [];
        if ((comment.reply_count || 0) > 0) {
          replies = await fetchRepliesRecursive(comment.id);
        }

        return {
          id: comment.id,
          author: comment.profiles?.username || 'Unknown',
          avatar: comment.profiles?.avatar_url,
          content: comment.comment_text,
          date: new Date(comment.created_at).toLocaleDateString(),
          likes: 0,
          hasChildren: (comment.reply_count || 0) > 0,
          parentId: comment.parent_comment,
          children: replies
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
        if (!response.ok) throw new Error("Failed to fetch reviews");
        const result = await response.json();
        
        // Get data from appropriate property
        const data = type === "ratings" 
          ? (result.ratings || result)
          : (result.posts || result);
        
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
