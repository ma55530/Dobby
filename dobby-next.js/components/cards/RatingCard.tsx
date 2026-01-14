/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Image from "next/image";

export default function RatingCard({ post }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden hover:border-zinc-600 transition-all duration-300 hover:shadow-lg flex h-24">
      {/* Left Side - Content */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        {/* Title and Rating */}
        <div>
          <h4 className="font-bold text-xs text-white line-clamp-1">{post.movieTitle}</h4>
          
          {/* Rating Display */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${(post.rating / 10) * 100}%` }}
              />
            </div>
            <span className="text-purple-400 font-bold text-sm whitespace-nowrap">{post.rating}</span>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {post.author.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-xs truncate">{post.author}</p>
          </div>
        </div>
      </div>

      {/* Right Side - Poster */}
      {post.moviePoster && (
        <div className="w-24 h-24 relative flex-shrink-0 bg-zinc-800">
          <Image
            src={post.moviePoster}
            alt={post.movieTitle}
            fill
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}
