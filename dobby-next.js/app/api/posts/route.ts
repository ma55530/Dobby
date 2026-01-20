import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");
  const filter = searchParams.get("filter"); // 'following' or null

  try {
    // Get current user for following filter
    let followedUserIds: string[] = [];
    if (filter === "following") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Fetch list of users that current user follows
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsError) {
        console.error("Error fetching follows:", followsError);
        return NextResponse.json({ error: followsError.message }, { status: 400 });
      }

      followedUserIds = follows?.map(f => f.following_id) || [];
      
      // If user doesn't follow anyone, return empty array
      if (followedUserIds.length === 0) {
        return NextResponse.json({ posts: [], hasMore: false, nextOffset: offset });
      }
    }

    // Build the query
    let query = supabase
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
      );

    // Apply following filter if needed
    if (filter === "following" && followedUserIds.length > 0) {
      query = query.in("rating.user_id", followedUserIds);
    }

    // Execute query
    const { data: posts, error: postsError } = await query
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
    const movieIds = [...new Set(posts.filter((p: Record<string, unknown>) => (p.rating as Record<string, unknown>)?.movie_id).map((p: Record<string, unknown>) => (p.rating as Record<string, unknown>).movie_id))];
    const showIds = [...new Set(posts.filter((p: Record<string, unknown>) => (p.rating as Record<string, unknown>)?.show_id).map((p: Record<string, unknown>) => (p.rating as Record<string, unknown>).show_id))];

    // Fetch movie posters
    for (const movieId of movieIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}`,
          get_options
        );
        if (res.ok) {
          const movieData = await res.json();
          const poster = movieData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
            : "";
          posterMap.set(`movie_${movieId}`, { poster, title: movieData.title });
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
          const poster = showData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${showData.poster_path}`
            : "";
          posterMap.set(`tv_${showId}`, { poster, title: showData.name });
        }
      } catch (error) {
        console.error(`Failed to fetch poster for show ${showId}:`, error);
      }
    }

    // Transform data to match frontend Review interface
    const transformedPosts = posts
      .filter((post: Record<string, unknown>) => post.rating) // Only include posts that have a rating
      .map((post: Record<string, unknown>) => {
        const rating = post.rating as Record<string, unknown>;
        const isMovie = !!rating.movie_id;
        const mediaId = isMovie ? rating.movie_id : rating.show_id;
        const mediaType = isMovie ? "movie" : "tv";
        const posterData = posterMap.get(`${mediaType}_${mediaId}`) || { poster: "", title: "Untitled" };
        
        return {
          id: post.id,
          author: (rating.profiles as Record<string, unknown>)?.username || "Anonymous",
          avatar: (rating.profiles as Record<string, unknown>)?.avatar_url,
          rating: rating.rating,
          content: post.post_text || "",
          date: new Date(rating.created_at as string).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          likes: post.like_count || 0,
          movieId: mediaId,
          movieTitle: posterData.title,
          movieType: mediaType as "movie" | "tv",
          moviePoster: posterData.poster,
          hasChildren: ((post.comment_count as number) || 0) > 0,
          commentCount: (post.comment_count as number) || 0,
          userId: rating.user_id,
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
