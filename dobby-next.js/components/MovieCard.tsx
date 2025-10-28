"use client";
import { Heart, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StarRating from "./StarRating";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  type: "movie" | "tv";
}

const MovieCard = ({ id, title, poster, rating, year, type }: MovieCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <Card className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.3)]">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img 
          src={poster} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button size="icon" className="rounded-full w-16 h-16" variant="default">
            <Play className="w-8 h-8 fill-current" />
          </Button>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background",
            isFavorite && "text-accent"
          )}
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </Button>

        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">{title}</h3>
          <div className="flex items-center justify-between">
            <StarRating rating={rating} size="sm" />
            <span className="text-sm text-muted-foreground">{year}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MovieCard;
