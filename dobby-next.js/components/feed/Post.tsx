import ReviewCard from "@/components/cards/ReviewCard";

interface Comment {
  id: number;
  author: string;
  avatar?: string;
  rating: number;
  content: string;
  date: string;
  likes: number;
  parentId?: number;
}

interface Review {
  id: number;
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
  onLoadMore?: (parentId: number) => void;
  nestedComments?: Record<number, Comment[]>;
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