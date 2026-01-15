"use client";

import Image from "next/image";
import { Heart, MessageCircle, Share2, ChevronDown, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

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
}

interface ReviewCardProps {
  post: {
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
  };
  onLoadMore?: (parentId: string) => void;
  nestedComments?: Record<string, Comment[]>;
  isNested?: boolean;
}

const ReviewCard = ({ post, onLoadMore, nestedComments, isNested = false }: ReviewCardProps) => {
  const [likes, setLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(false);
  const [dislikes, setDislikes] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyOpenById, setReplyOpenById] = useState<Record<string, boolean>>({});
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({});
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has liked/disliked this review and get current counts
    const checkReactionStatus = async () => {
      try {
        const [statusRes, countRes] = await Promise.all([
          fetch(`/api/posts/${post.id}/reaction/status`),
          fetch(`/api/posts/${post.id}/likes-count`)
        ]);
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsLiked(statusData.liked);
          setIsDisliked(statusData.disliked);
        }
        
        if (countRes.ok) {
          const countData = await countRes.json();
          setLikes(countData.likes);
          setDislikes(countData.dislikes || 0);
        }
      } catch (error) {
        console.error("Failed to check reaction status:", error);
      }
    };
    checkReactionStatus();
  }, [post.id]);

  const handleLike = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikes(data.likes);
        setIsDisliked(data.disliked || false);
        setDislikes(data.dislikes || 0);
      }
    } catch (error) {
      console.error("Failed to like review:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/dislike`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setIsDisliked(data.disliked);
        setDislikes(data.dislikes);
        setIsLiked(data.liked || false);
        setLikes(data.likes || 0);
      }
    } catch (error) {
      console.error("Failed to dislike review:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post.id,
          comment_text: commentText.trim(),
        }),
      });

      if (response.ok) {
        setCommentText("");
        setShowCommentForm(false);
        // Optionally refresh the page or update the comments list
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReplyForm = (childId: string) => {
    setReplyOpenById((prev) => ({ ...prev, [childId]: !prev[childId] }));
  };

  const handleSubmitReply = async (childId: string) => {
    const text = (replyTextById[childId] || "").trim();
    if (!text || replySubmittingId === childId) return;

    setReplySubmittingId(childId);
    try {
      const response = await fetch(`/api/comments/${childId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_text: text,
        }),
      });

      if (response.ok) {
        setReplyTextById((prev) => ({ ...prev, [childId]: "" }));
        setReplyOpenById((prev) => ({ ...prev, [childId]: false }));
        // Optional refresh; or load children on demand
        if (onLoadMore) onLoadMore(childId);
      }
    } catch (error) {
      console.error("Failed to submit reply:", error);
    } finally {
      setReplySubmittingId(null);
    }
  };

  // Control replies box visibility - show if has comments or children loaded
  const shouldShowRepliesBox = post.hasChildren || (post.children?.length ?? 0) > 0 || (showComments && !!nestedComments?.[post.id]);

  return (
    <div className="max-w-3xl space-y-3">
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden hover:border-zinc-600 transition-all duration-300 hover:shadow-lg">
      <div className="flex gap-6">
        {/* Movie Poster */}
        {post.moviePoster && (
          <div className="w-48 h-72 relative flex-shrink-0 bg-zinc-800">
            <Image
              src={post.moviePoster}
              alt={post.movieTitle || "Movie poster"}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col min-w-0">
          {/* User Info at Top */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {post.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white text-base">{post.author}</p>
              <p className="text-sm text-gray-400">{post.date}</p>
            </div>
          </div>

          {/* Movie Title */}
          {post.movieTitle && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-xl text-white line-clamp-2">
                  {post.movieTitle}
                </h3>
                {post.movieType && (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    post.movieType === 'movie' 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                      : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                  }`}>
                    {post.movieType === 'movie' ? 'Movie' : 'TV Show'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Rating Bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${(post.rating / 10) * 100}%` }}
              />
            </div>
            <span className="text-purple-400 font-bold text-base whitespace-nowrap">
              {post.rating}
            </span>
          </div>

          {/* Review Content */}
          <p className="text-gray-300 text-base leading-relaxed mb-6 flex-grow">
            {post.content}
          </p>

          {/* Action Buttons at Bottom */}
          <div className="flex items-center gap-2 pt-4 border-t border-zinc-700/50">
            <Button 
              variant="ghost" 
              size="default" 
              className="gap-2 flex-1"
              onClick={handleLike}
              disabled={isLoading}
            >
              <Heart className={`w-5 h-5 transition-colors ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              <span>{likes}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="default" 
              className="gap-2 flex-1"
              onClick={handleDislike}
              disabled={isLoading}
            >
              <ThumbsDown className={`w-5 h-5 transition-colors ${isDisliked ? "fill-blue-500 text-blue-500" : ""}`} />
              <span>{dislikes}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="default" 
              className="gap-2 flex-1"
              onClick={() => setShowCommentForm(!showCommentForm)}
            >
              <MessageCircle className="w-5 h-5" />
              <span>Comment</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="default" 
              className="gap-2 flex-1"
            >
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </Button>
          </div>

          {/* Comment Form */}
          {showCommentForm && (
            <div className="mt-4 pt-4 border-t border-zinc-700/50">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-zinc-800 text-white rounded-lg p-3 min-h-[100px] border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCommentForm(false);
                    setCommentText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    {/* Replies below, neatly attached to this card */}
    {!isNested && shouldShowRepliesBox && (
      <div className="pl-6">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4 space-y-3 max-w-2xl">
          {/* Direct children shown initially */}
          {(post.children && post.children.length > 0) && (
            <div className="space-y-3">
              {post.children.map((child) => (
                <div key={child.id}>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {child.author?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-none inline-block max-w-[65ch]">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">{child.author || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{child.date}</p>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{child.content}</p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleReplyForm(child.id)} className="text-purple-400 hover:text-purple-300">
                          Reply
                        </Button>
                      </div>
                      {replyOpenById[child.id] && (
                        <div className="mt-2">
                          <textarea
                            value={replyTextById[child.id] || ""}
                            onChange={(e) => setReplyTextById((prev) => ({ ...prev, [child.id]: e.target.value }))}
                            placeholder="Write a reply..."
                            className="w-full bg-zinc-800 text-white rounded-lg p-2 min-h-[60px] border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => toggleReplyForm(child.id)}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSubmitReply(child.id)} disabled={!((replyTextById[child.id] || "").trim()) || replySubmittingId === child.id} className="bg-purple-600 hover:bg-purple-700">
                              {replySubmittingId === child.id ? "Posting..." : "Post Reply"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More Button for comments - show if post has children */}
          {post.hasChildren && onLoadMore && (
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300"
              onClick={() => {
                setShowComments(!showComments);
                if (!showComments && !nestedComments?.[post.id]) {
                  onLoadMore(post.id);
                }
              }}
            >
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showComments ? "rotate-180" : ""}`} />
              {showComments ? "Hide comments" : `View comments (${post.hasChildren ? 'Show' : ''})`}
            </Button>
          )}

          {/* Additional Nested Comments from "Show More" */}
          {showComments && nestedComments?.[post.id] && (
            <div className="mt-2 space-y-3">
              {nestedComments[post.id].map((child) => (
                <div key={child.id}>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {child.author?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-none inline-block max-w-[65ch]">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">{child.author || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{child.date}</p>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{child.content}</p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleReplyForm(child.id)} className="text-purple-400 hover:text-purple-300">
                          Reply
                        </Button>
                      </div>
                      {replyOpenById[child.id] && (
                        <div className="mt-2">
                          <textarea
                            value={replyTextById[child.id] || ""}
                            onChange={(e) => setReplyTextById((prev) => ({ ...prev, [child.id]: e.target.value }))}
                            placeholder="Write a reply..."
                            className="w-full bg-zinc-800 text-white rounded-lg p-2 min-h-[60px] border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => toggleReplyForm(child.id)}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSubmitReply(child.id)} disabled={!((replyTextById[child.id] || "").trim()) || replySubmittingId === child.id} className="bg-purple-600 hover:bg-purple-700">
                              {replySubmittingId === child.id ? "Posting..." : "Post Reply"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
};

export default ReviewCard;
