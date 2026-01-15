import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Fetch all ratings with optional posts
    const { data: ratings, error: ratingsError } = await supabase
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
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (ratingsError) {
      console.error("Supabase ratings error:", ratingsError);
      return NextResponse.json({ error: ratingsError.message }, { status: 400 });
    }

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({ ratings: [], hasMore: false, nextOffset: offset });
    }

    // Filter to only include ratings without post_text (ratings only, no reviews)
    const ratingsOnly = ratings.filter((r: any) => !r.post || !r.post.post_text || r.post.post_text.trim() === "");

    // Build poster map - fetch posters based on type
    const posterMap = new Map();
    
    // Get unique movie IDs and show IDs
    const movieIds = [...new Set(ratingsOnly.filter((r: any) => r.movie_id).map((r: any) => r.movie_id))];
    const showIds = [...new Set(ratingsOnly.filter((r: any) => r.show_id).map((r: any) => r.show_id))];

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
    const transformedRatings = ratingsOnly.map((ratingItem: any) => {
      const isMovie = !!ratingItem.movie_id;
      const mediaId = isMovie ? ratingItem.movie_id : ratingItem.show_id;
      const mediaType = isMovie ? "movie" : "tv";
      const posterData = posterMap.get(`${mediaType}_${mediaId}`) || { posterUrl: "", title: "Untitled" };
      
      return {
        id: ratingItem.id,
        author: ratingItem.profiles?.username || "Anonymous",
        avatar: ratingItem.profiles?.avatar_url,
        rating: ratingItem.rating,
        content: "", // No content for ratings-only
        date: new Date(ratingItem.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        likes: 0,
        movieId: mediaId,
        movieTitle: posterData.title,
        movieType: mediaType as "movie" | "tv",
        moviePoster: posterData.posterUrl,
        hasChildren: false,
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
