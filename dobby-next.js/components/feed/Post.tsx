import ReviewCard from "@/components/cards/ReviewCard";

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  rating?: number;
  content: string;
  date: string;
  likes: number;
  parentId?: string;
}

interface Review {
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
}

interface PostProps {
  post: Review;
  onLoadMore?: (parentId: string) => void;
  nestedComments?: Record<string, Comment[]>;
}

const Post = ({ post, onLoadMore, nestedComments }: PostProps) => {
  return (
    <ReviewCard 
      post={post} 
      onLoadMore={onLoadMore}
      nestedComments={nestedComments}
    />
  );
};

export default Post;