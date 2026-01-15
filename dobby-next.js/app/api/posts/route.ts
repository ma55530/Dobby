import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Fetch posts with ratings and user info
    const { data: posts, error: postsError } = await supabase
      .from("post")
      .select(
        `
        id,
        title,
        post_text,
        like_count,
        dislike_count,
        comment_count,
        rating!inner (
          id,
          user_id,
          movie_id,
          show_id,
          rating,
          created_at,
          profiles (
            username,
            avatar_url
          )
        )
      `
      )
      .order("rating(created_at)", { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error("Supabase posts error:", postsError);
      return NextResponse.json({ error: postsError.message }, { status: 400 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [], hasMore: false, nextOffset: offset });
    }

    // Build poster map - fetch posters based on type
    const posterMap = new Map();
    
    // Get unique movie IDs and show IDs
    const movieIds = [...new Set(posts.filter((p: any) => p.rating?.movie_id).map((p: any) => p.rating.movie_id))];
    const showIds = [...new Set(posts.filter((p: any) => p.rating?.show_id).map((p: any) => p.rating.show_id))];

    // Fetch movie posters
    for (const movieId of movieIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}`,
          get_options
        );
        if (res.ok) {
          const movieData = await res.json();
          const posterUrl = movieData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
            : "";
          posterMap.set(`movie_${movieId}`, { posterUrl, title: movieData.title });
        }
      } catch (error) {
        console.error(`Failed to fetch poster for movie ${movieId}:`, error);
      }
    }

    // Fetch show posters
    for (const showId of showIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${showId}`,
          get_options
        );
        if (res.ok) {
          const showData = await res.json();
          const posterUrl = showData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${showData.poster_path}`
            : "";
          posterMap.set(`tv_${showId}`, { posterUrl, title: showData.name });
        }
      } catch (error) {
        console.error(`Failed to fetch poster for show ${showId}:`, error);
      }
    }

    // Transform data to match frontend Review interface
    const transformedPosts = posts
      .filter((post: any) => post.rating) // Only include posts that have a rating
      .map((post: any) => {
        const isMovie = !!post.rating.movie_id;
        const mediaId = isMovie ? post.rating.movie_id : post.rating.show_id;
        const mediaType = isMovie ? "movie" : "tv";
        const posterData = posterMap.get(`${mediaType}_${mediaId}`) || { posterUrl: "", title: "Untitled" };
        
        return {
          id: post.id,
          author: post.rating.profiles?.username || "Anonymous",
          avatar: post.rating.profiles?.avatar_url,
          rating: post.rating.rating,
          content: post.post_text || "",
          date: new Date(post.rating.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          likes: post.like_count || 0,
          movieId: mediaId,
          movieTitle: posterData.title,
          movieType: mediaType as "movie" | "tv",
          moviePoster: posterData.posterUrl,
          hasChildren: (post.comment_count || 0) > 0,
        };
      });

    const hasMore = posts.length === limit;
    const nextOffset = offset + limit;

    return NextResponse.json({ 
      posts: transformedPosts, 
      hasMore, 
      nextOffset 
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
