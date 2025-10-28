import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const StarRating = ({ 
  rating, 
  maxRating = 5, 
  size = "md", 
  showValue = true,
  interactive = false,
  onRatingChange
}: StarRatingProps) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              index < Math.floor(rating) 
                ? "fill-accent text-accent" 
                : index < rating 
                ? "fill-accent/50 text-accent" 
                : "fill-transparent text-muted-foreground",
              interactive && "cursor-pointer hover:scale-110 transition-transform"
            )}
            onClick={() => handleClick(index)}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;
