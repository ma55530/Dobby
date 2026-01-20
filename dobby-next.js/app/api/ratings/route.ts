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
        return NextResponse.json({ ratings: [], hasMore: false, nextOffset: offset });
      }
    }

    // Build the query
    let query = supabase
      .from("rating")
      .select(
        `
        id,
        user_id,
        movie_id,
        show_id,
        rating,
        created_at,
        updated_at,
        profiles (
          username,
          avatar_url
        ),
        post (
          id,
          post_text
        )
      `
      );

    // Apply following filter if needed
    if (filter === "following" && followedUserIds.length > 0) {
      query = query.in("user_id", followedUserIds);
    }

    // Execute query - fetch more to account for filtering
    const { data: ratings, error: ratingsError } = await query
      .order("created_at", { ascending: false })
      .limit(limit * 3); // Fetch 3x to account for reviews being filtered out

    if (ratingsError) {
      console.error("Supabase ratings error:", ratingsError);
      return NextResponse.json({ error: ratingsError.message }, { status: 400 });
    }

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({ ratings: [], hasMore: false, nextOffset: offset });
    }

    // Filter to only include ratings without post_text (ratings only, no reviews)
    const ratingsOnly = ratings
      .filter((r: Record<string, unknown>) => !(r.post as Record<string, unknown>)?.post_text || !(r.post as Record<string, unknown>).post_text || (r.post as Record<string, unknown>).post_text === "")
      .slice(0, limit); // Take only the requested number after filtering

    // Build poster map - fetch posters based on type
    const posterMap = new Map<string, { title: string; poster: string }>();
    
    // Get unique movie IDs and show IDs
    const movieIds = [...new Set(ratingsOnly.filter((r: Record<string, unknown>) => r.movie_id).map((r: Record<string, unknown>) => r.movie_id))];
    const showIds = [...new Set(ratingsOnly.filter((r: Record<string, unknown>) => r.show_id).map((r: Record<string, unknown>) => r.show_id))];

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
    const transformedRatings = ratingsOnly.map((ratingItem: Record<string, unknown>) => {
      const isMovie = !!ratingItem.movie_id;
      const mediaId = isMovie ? ratingItem.movie_id : ratingItem.show_id;
      const mediaType = isMovie ? "movie" : "tv";
      const posterData = posterMap.get(`${mediaType}_${mediaId}`) || { poster: "", title: "Untitled" };
      const profiles = ratingItem.profiles as Record<string, unknown> | undefined;
      
      return {
        id: ratingItem.id,
        author: profiles?.username || "Anonymous",
        avatar: profiles?.avatar_url,
        rating: ratingItem.rating,
        content: "", // No content for ratings-only
        date: new Date(ratingItem.created_at as string).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        likes: 0,
        movieId: mediaId,
        movieTitle: posterData.title,
        movieType: mediaType as "movie" | "tv",
        moviePoster: posterData.poster,
        hasChildren: false,
        userId: ratingItem.user_id,
      };
    });

    const hasMore = ratingsOnly.length === limit;
    const nextOffset = offset + limit;

    return NextResponse.json({ 
      ratings: transformedRatings, 
      hasMore, 
      nextOffset 
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }
}
