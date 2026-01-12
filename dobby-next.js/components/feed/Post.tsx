"use client";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

export default function Post({ post }: any) {
  const [likes, setLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    if (!isLiked) {
      setLikes(likes + 1);
      setIsLiked(true);
    } else {
      setLikes(likes - 1);
      setIsLiked(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col lg:flex-row lg:h-80 h-auto">
      {/* Left Side - Poster Image (30% on desktop, full width on mobile) */}
      {post.moviePoster && (
        <div className="w-full lg:w-[30%] h-48 lg:h-auto relative flex-shrink-0 bg-zinc-800">
          <Image
            src={post.moviePoster}
            alt={post.movieTitle}
            fill
            className="object-contain"
          />
        </div>
      )}

      {/* Right Side - Content (70% on desktop, full width on mobile) */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs lg:text-sm">
              {post.author.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-white text-xs lg:text-sm">{post.author}</p>
              <p className="text-xs text-gray-400">{post.date}</p>
            </div>
          </div>
        </div>

        {/* Movie/Show Info */}
        {post.movieTitle && (
          <div className="px-3 lg:px-4 pt-2 lg:pt-3 pb-1 lg:pb-2">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-bold text-base lg:text-lg text-white line-clamp-1">{post.movieTitle}</h3>
              <span className="text-xs bg-purple-900/50 text-purple-200 px-2 py-1 rounded flex-shrink-0">
                {post.movieType === "tv" ? "TV Show" : "Movie"}
              </span>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${(post.rating / 10) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-purple-400 font-semibold whitespace-nowrap text-xs lg:text-sm flex-shrink-0">{post.rating}/10</span>
            </div>
          </div>
        )}

        {/* Review Content */}
        <div className="px-3 lg:px-4 py-2 lg:py-3 border-t border-zinc-700 flex-1 overflow-hidden">
          <p className="text-gray-200 text-xs lg:text-lg leading-relaxed line-clamp-3 lg:line-clamp-none">{post.content}</p>
        </div>

        {/* Actions */}
        <div className="px-3 lg:px-4 py-2 lg:py-3 border-t border-zinc-700 flex justify-around text-gray-400 text-xs lg:text-sm gap-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 lg:gap-2 py-2 px-2 lg:px-3 rounded-lg transition-all whitespace-nowrap ${
              isLiked
                ? "text-red-500 bg-red-900/20"
                : "hover:bg-zinc-700/50 hover:text-red-400"
            }`}
          >
            <Heart size={16} className="lg:w-[18px] lg:h-[18px]" fill={isLiked ? "currentColor" : "none"} />
            <span className="text-xs hidden sm:inline">{likes}</span>
          </button>
          <button className="flex items-center gap-1 lg:gap-2 py-2 px-2 lg:px-3 rounded-lg hover:bg-zinc-700/50 hover:text-blue-400 transition-all whitespace-nowrap">
            <MessageCircle size={16} className="lg:w-[18px] lg:h-[18px]" />
            <span className="text-xs hidden sm:inline">Reply</span>
          </button>
          <button className="flex items-center gap-1 lg:gap-2 py-2 px-2 lg:px-3 rounded-lg hover:bg-zinc-700/50 hover:text-green-400 transition-all whitespace-nowrap">
            <Share2 size={16} className="lg:w-[18px] lg:h-[18px]" />
            <span className="text-xs hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
