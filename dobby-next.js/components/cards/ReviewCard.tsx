"use client";

import Image from "next/image";
import { Heart, MessageCircle, Share2, ChevronDown, ThumbsDown, CornerDownRight, Send} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

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
    commentCount?: number;
  };
  onLoadMore?: (parentId: string) => void;
  nestedComments?: Record<string, Comment[]>;
  isNested?: boolean;
}

function CommentCard({
  comment,
  onReply,
  replyOpen,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  isSubmitting,
  onToggleReply,
}: {
  comment: Comment;
  onReply: () => void;
  replyOpen: boolean;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: () => void;
  isSubmitting: boolean;
  onToggleReply: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [needsExpansion, setNeedsExpansion] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const actualHeight = textRef.current.scrollHeight;
      setNeedsExpansion(actualHeight > lineHeight * 1.2); // More than 1 line
    }
  }, [comment.content]);

  return (
    <div className="group relative">
      <div className="relative bg-zinc-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 transition-all duration-300 hover:border-purple-500/30 hover:bg-zinc-800/60">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              {comment.author?.charAt(0).toUpperCase() || "?"}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-zinc-100 text-sm hover:text-purple-400 cursor-pointer transition-colors">
                {comment.author}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">
                {comment.date}
              </span>
            </div>

            <div>
              <p 
                ref={textRef}
                className={`text-zinc-300 text-sm leading-relaxed mb-1 transition-all duration-300 break-words overflow-wrap-anywhere ${
                  !isExpanded && needsExpansion ? "line-clamp-1" : ""
                }`}
              >
                {comment.content}
              </p>
              {needsExpansion && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-purple-400 hover:text-purple-300 text-xs font-medium mb-2 transition-colors"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={onToggleReply}
                className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                Reply
              </button>
            </div>

            {/* REPLY FORM - Identičan onome na Reviewu */}
            {replyOpen && (
              <div className="mt-5 pt-5 border-t border-zinc-700/50 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <textarea
                    key={`reply-area-${comment.id}`} // Dodajemo ključ da spriječimo nepotrebno fokusiranje
                    value={replyText || ""}
                    onChange={(e) => onReplyTextChange(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full bg-zinc-950/50 text-white rounded-xl p-4 pr-24 min-h-[100px] border border-zinc-700 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none placeholder:text-zinc-600 transition-all text-left"
                    // Maknuli smo dir="ltr" i dodali text-left radi sigurnosti
                    autoFocus
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      type="button" // Osiguraj da nije submit
                      onClick={onToggleReply}
                      className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onSubmitReply}
                      disabled={!replyText?.trim() || isSubmitting}
                      className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post Reply"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Recursive component to render nested replies at any depth
function RenderNestedReplies({
  replies,
  level,
  replyOpenById,
  replyTextById,
  replySubmittingId,
  toggleReplyForm,
  setReplyTextById,
  handleSubmitReply,
}: {
  replies: Comment[];
  level: number;
  replyOpenById: Record<string, boolean>;
  replyTextById: Record<string, string>;
  replySubmittingId: string | null;
  toggleReplyForm: (id: string) => void;
  setReplyTextById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSubmitReply: (id: string) => void;
}) {
  return (
    <div className="relative ml-8 space-y-4 mt-4">
      {/* Vertical thread line connecting parent to replies */}
      <div className="absolute left-[-20px] top-[-16px] bottom-4 w-[2px] bg-gradient-to-b from-purple-500/40 to-transparent" />
      
      {replies.map((reply) => (
        <div key={reply.id} className="space-y-4">
          <div className="relative">
            <div className="absolute left-[-20px] top-5 w-8 h-[2px] bg-purple-500/40" />
            <CommentCard 
              comment={reply}
              onReply={() => toggleReplyForm(reply.id)}
              replyOpen={replyOpenById[reply.id] || false}
              replyText={replyTextById[reply.id] || ""}
              onReplyTextChange={(text) => setReplyTextById((prev) => ({ ...prev, [reply.id]: text }))}
              onSubmitReply={() => handleSubmitReply(reply.id)}
              isSubmitting={replySubmittingId === reply.id}
              onToggleReply={() => toggleReplyForm(reply.id)}
            />
          </div>
          
          {/* Recursively render nested replies */}
          {reply.children && reply.children.length > 0 && (
            <RenderNestedReplies 
              replies={reply.children}
              level={level + 1}
              replyOpenById={replyOpenById}
              replyTextById={replyTextById}
              replySubmittingId={replySubmittingId}
              toggleReplyForm={toggleReplyForm}
              setReplyTextById={setReplyTextById}
              handleSubmitReply={handleSubmitReply}
            />
          )}
        </div>
      ))}
    </div>
  );
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
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 4; // 4 lines
      const actualHeight = textRef.current.scrollHeight;
      setShowReadMore(actualHeight > maxHeight);
    }
  }, [post.content]);

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
      const response = await fetch(`/api/comments/${childId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_text: text,
        }),
      });

      if (response.ok) {
        setReplyTextById((prev) => ({ ...prev, [childId]: "" }));
        setReplyOpenById((prev) => ({ ...prev, [childId]: false }));
        // Reload to show new reply
        window.location.reload();
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
          <div className="mb-6 flex-grow">
            <p 
              ref={textRef}
              className={`text-gray-300 text-base leading-relaxed break-words whitespace-pre-wrap transition-all duration-300 ${
                !isTextExpanded && showReadMore ? "line-clamp-4" : ""
              }`}
            >
              {post.content}
            </p>
            
            {showReadMore && (
              <button
                onClick={() => setIsTextExpanded(!isTextExpanded)}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium mt-2 transition-colors"
              >
                {isTextExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>

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

          {showCommentForm && (
              <div className="mt-5 pt-5 border-t border-border animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full bg-input text-foreground rounded-xl p-4 pr-24 min-h-[100px] border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground transition-all"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      onClick={() => {
                        setShowCommentForm(false)
                        setCommentText("")
                      }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmitting}
                      className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- SEKCIJA KOMENTARA --- */}
        {!isNested && shouldShowRepliesBox && (
          <div className="relative mt-0 ml-4 sm:ml-10">
            
            {/* NIT: Shows thread line - fully colored when closed, transparent end when open */}
            <div className={`absolute left-0 top-0 bottom-6 w-[2px] animate-in fade-in duration-500 ${
              showComments 
                ? "bg-gradient-to-b from-purple-500/40 via-purple-500/40 to-transparent"
                : "bg-purple-500/40"
            }`} />

            <div className="space-y-4 pl-8 pt-4">
              
              {/* 1. Direktni komentari (ako želiš da su uvijek vidljivi) */}
              {post.children && post.children.length > 0 && (
                <div className="space-y-5 mb-4">
                  {post.children.map((child) => (
                    <div key={child.id} className="relative group">
                      <div className="absolute left-[-32px] top-5 w-8 h-[2px] bg-purple-500/40" />
                      <CommentCard 
                        comment={child}
                        onReply={() => toggleReplyForm(child.id)}
                        replyOpen={replyOpenById[child.id] || false}
                        replyText={replyTextById[child.id] || ""}
                        onReplyTextChange={(text) => setReplyTextById((prev) => ({ ...prev, [child.id]: text }))}
                        onSubmitReply={() => handleSubmitReply(child.id)}
                        isSubmitting={replySubmittingId === child.id}
                        onToggleReply={() => toggleReplyForm(child.id)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Gumb koji služi kao "most" - on kontrolira pojavljivanje ostatka niti */}
              {post.hasChildren && (
                <div className="relative py-2">
                  {/* Spojnica za gumb se vidi samo ako gumb ima smisla */}
                  <div className="absolute left-[-32px] top-7 w-8 h-[2px] bg-gradient-to-r from-purple-500/50 to-purple-500/40" />
                  
                  <button
                    onClick={() => {
                      setShowComments(!showComments);
                      if (!showComments && !nestedComments?.[post.id]) {
                        onLoadMore?.(post.id);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:text-zinc-200"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {showComments ? "Hide Comments" : "Show Comments"}
                    </span>
                    {post.commentCount !== undefined && post.commentCount > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                        {post.commentCount}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-500 ${showComments ? "rotate-180" : ""}`} />
                  </button>
                </div>
              )}

              {/* 3. Ugniježđeni komentari (on demand) */}
              {showComments && nestedComments?.[post.id] && (
                <div className="space-y-5 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  {nestedComments[post.id].map((child) => (
                    <div key={child.id} className="space-y-4">
                      <div className="relative">
                        <div className="absolute left-[-32px] top-5 w-8 h-[2px] bg-purple-500/30" />
                        <CommentCard 
                          comment={child}
                          onReply={() => toggleReplyForm(child.id)}
                          replyOpen={replyOpenById[child.id] || false}
                          replyText={replyTextById[child.id] || ""}
                          onReplyTextChange={(text) => setReplyTextById((prev) => ({ ...prev, [child.id]: text }))}
                          onSubmitReply={() => handleSubmitReply(child.id)}
                          isSubmitting={replySubmittingId === child.id}
                          onToggleReply={() => toggleReplyForm(child.id)}
                        />
                      </div>
                      {/* Nested replies - Recursive */}
                      {child.children && child.children.length > 0 && (
                        <RenderNestedReplies 
                          replies={child.children}
                          level={1}
                          replyOpenById={replyOpenById}
                          replyTextById={replyTextById}
                          replySubmittingId={replySubmittingId}
                          toggleReplyForm={toggleReplyForm}
                          setReplyTextById={setReplyTextById}
                          handleSubmitReply={handleSubmitReply}
                        />
                      )}
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
