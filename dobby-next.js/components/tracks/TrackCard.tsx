"use client";

import { format } from "date-fns";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { Movie } from "@/lib/types/Movie";

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const imageUrl = getImageUrl(movie.poster_path || "");

  return (
    <div
      onClick={onClick}
      className="relative w-48 h-72 rounded-xl overflow-hidden group cursor-pointer shadow-lg"
    >
      {/* Background image */}
      <Image
        src={imageUrl}
        alt={movie.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, 200px"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content overlay */}
      <div className="absolute bottom-0 p-3 text-white w-full">
        <h3 className="text-sm font-semibold line-clamp-1">{movie.title}</h3>

        <div className="flex items-center justify-between mt-1 text-xs text-gray-300">
          <span>
            {movie.release_date
              ? format(new Date(movie.release_date), "MMMM do, yyyy")
              : "—"}
          </span>
          <Badge
            variant="secondary"
            className="bg-yellow-500 text-black text-xs font-semibold px-1.5"
          >
            ⭐ {movie.vote_average.toFixed(1)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
