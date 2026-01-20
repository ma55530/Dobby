import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
}

interface TmdbShow {
  id: number;
  name: string;
  poster_path: string | null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    // Fetch user's ratings from unified rating table with post details
    const { data: ratings, error: ratingsError } = await supabase
      .from("rating")
      .select(`
        id,
        movie_id,
        show_id,
        rating,
        created_at,
        post (
          id,
          post_text
        ),
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("user_id", user.id)
      .not("rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit * 3); // Fetch 3x to account for filtering out ratings without reviews

    if (ratingsError) {
      console.error("Error fetching ratings:", ratingsError);
      return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
    }

    // Filter to only include ratings with review text (actual reviews)
    const reviewRatings = (ratings || []).filter(
      (r: Record<string, unknown>) => (r.post as Record<string, unknown>)?.post_text && ((r.post as Record<string, unknown>).post_text as string).trim() !== ""
    ).slice(0, limit);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single();

    // Build poster map - fetch posters based on type
    const posterMap = new Map<string, { title: string; poster: string }>();
    
    // Get unique movie IDs and show IDs
    const movieIds = [...new Set(reviewRatings.filter((r: Record<string, unknown>) => r.movie_id).map((r: Record<string, unknown>) => r.movie_id))];
    const showIds = [...new Set(reviewRatings.filter((r: Record<string, unknown>) => r.show_id).map((r: Record<string, unknown>) => r.show_id))];

    // Fetch movie posters
    for (const movieId of movieIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}`,
          get_options
        );
        if (res.ok) {
          const movieData: TmdbMovie = await res.json();
          const posterUrl = movieData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
            : "/placeholder-poster.png";
          posterMap.set(`movie_${movieId}`, { title: movieData.title, poster: posterUrl });
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
          const showData: TmdbShow = await res.json();
          const posterUrl = showData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${showData.poster_path}`
            : "/placeholder-poster.png";
          posterMap.set(`tv_${showId}`, { title: showData.name, poster: posterUrl });
        }
      } catch (error) {
        console.error(`Failed to fetch poster for show ${showId}:`, error);
      }
    }

    // Transform data to match frontend Review interface
    const transformedReviews = reviewRatings.map((ratingItem: Record<string, unknown>) => {
      const isMovie = !!ratingItem.movie_id;
      const mediaId = isMovie ? ratingItem.movie_id : ratingItem.show_id;
      const mediaType = isMovie ? "movie" : "tv";
      const posterData = posterMap.get(`${mediaType}_${mediaId}`) || { title: "Untitled", poster: "/placeholder-poster.png" };
      const post = ratingItem.post as Record<string, unknown> | undefined;
      const profiles = ratingItem.profiles as Record<string, unknown> | undefined;
      
      return {
        id: post?.id || ratingItem.id,
        author: profiles?.username || profile?.username || "Unknown",
        avatar: profiles?.avatar_url || profile?.avatar_url,
        rating: ratingItem.rating,
        content: post?.post_text || "",
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
        children: [],
        userId: user.id,
      };
    });

    return NextResponse.json({ reviews: transformedReviews });
  } catch (err) {
    console.error("Error in user reviews endpoint:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
