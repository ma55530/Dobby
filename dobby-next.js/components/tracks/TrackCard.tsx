"use client";

import { format } from "date-fns";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { useState } from "react";
import Link from "next/link";

interface TrackCardProps {
  id: number;
  title: string;
  poster: string | null;
  rating: number;
  year: string;
  infoAboutTrack?: string | number | null;
  href: string; // Link destination
}

export default function TrackCard({
  id,
  title,
  poster,
  rating,
  year,
  infoAboutTrack,
  href,
}: TrackCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(poster || "");
  const fallbackUrl = "/assets/placeholder-upload.svg";


  return (
    <Link href={href}>
      <div className="group relative h-72 w-48 cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-magic hover:ring-2 hover:ring-primary/40 hover:animate-glow">
        <Image
          src={!imageError && poster ? imageUrl : fallbackUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, 200px"
          onError={() => setImageError(true)}
          priority={false}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 w-full translate-y-2 space-y-1 bg-black/35 px-3 pb-3 pt-2 backdrop-blur-sm opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <h3 className="text-sm font-semibold text-white line-clamp-1">{title}</h3>
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>
              {(year ? format(new Date(year), "yyyy") : "—") +
                (infoAboutTrack ? ` • ${infoAboutTrack}` : "")}
            </span>
            <Badge
              variant="secondary"
              className="bg-white/15 text-white shadow-ring transition-transform duration-300 group-hover:scale-105"
            >
              ⭐ {rating.toFixed(1)}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}