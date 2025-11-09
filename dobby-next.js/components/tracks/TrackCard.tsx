"use client";

import { format } from "date-fns";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/TMDB_API/utils";

interface TrackCardProps {
  id: number;
  title: string;
  poster: string | null;
  rating: number;
  year: string;
  infoAboutTrack?: string | number | null; 
  onClick: () => void;
}

export default function TrackCard({id, title, poster, rating, year, infoAboutTrack, onClick }: TrackCardProps) {
  const imageUrl = getImageUrl(poster || "");

  return (
    <div
      onClick={onClick}
      className="relative w-48 h-72 rounded-xl overflow-hidden group cursor-pointer shadow-lg"
    >
      {/* Background image */}
      <Image
        src={imageUrl}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, 200px"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Content overlay */}
      <div className="absolute bottom-0 p-3 space-y-1 bg-black/25 text-white w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 ">
        <h3 className="text-sm font-semibold line-clamp-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">{title}</h3>

        <div className="flex items-center justify-between mt-1 text-xs text-gray-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span>
            {(year ? format(new Date(year), "yyyy") : "—") + (infoAboutTrack ? ` • ${infoAboutTrack}` : "")}
          </span>
          <Badge
            variant="secondary"
            className="bg-transparent text-white text-xs font-semibold px-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            ⭐ {rating.toFixed(1)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
