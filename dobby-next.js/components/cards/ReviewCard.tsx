"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import StarRating from "./StarRating";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewCardProps {
  author: string;
  avatar?: string;
  rating: number;
  content: string;
  date: string;
  likes: number;
}

const ReviewCard = ({
  author,
  avatar,
  rating,
  content,
  date,
  likes,
}: ReviewCardProps) => {
  const initials = author.slice(0, 2).toUpperCase();

  return (
    <Card className="p-6 bg-card border-border hover:shadow-lg transition-all duration-300">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatar} alt={author} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-foreground">{author}</h4>
              <p className="text-sm text-muted-foreground">{date}</p>
            </div>
            <StarRating rating={rating} size="sm" />
          </div>

          <p className="text-foreground/90 leading-relaxed mb-4">{content}</p>

          <Button variant="ghost" size="sm" className="gap-2">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">{likes}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ReviewCard;
