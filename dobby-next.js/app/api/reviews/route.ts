import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET() {
  const supabase = await createClient();

  try {
    // Fetch movie ratings
    const { data: movieReviews, error: movieError } = await supabase
      .from("movie_ratings")
      .select(
        `
        id,
        user_id,
        movie_id,
        rating,
        review,
        created_at,
        profiles (
          username,
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch show ratings
    const { data: showReviews, error: showError } = await supabase
      .from("show_ratings")
      .select(
        `
        id,
        user_id,
        show_id,
        rating,
        review,
        created_at,
        profiles (
          username,
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (movieError) {
      console.error("Supabase movie error:", movieError);
      return NextResponse.json({ error: movieError.message }, { status: 400 });
    }

    if (showError) {
      console.error("Supabase show error:", showError);
      return NextResponse.json({ error: showError.message }, { status: 400 });
    }

    // Combine and sort all reviews by date
    const allData = [
      ...(movieReviews || []).map((r: any) => ({ ...r, type: "movie", contentId: r.movie_id })),
      ...(showReviews || []).map((r: any) => ({ ...r, type: "tv", contentId: r.show_id })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 20);

    if (!allData || allData.length === 0) {
      return NextResponse.json([]);
    }

    // Build poster map - fetch posters based on type
    const posterMap = new Map();
    
    // Get unique movie IDs and show IDs
    const movieIds = [...new Set(allData.filter((r: any) => r.type === "movie").map((r: any) => r.movie_id))];
    const showIds = [...new Set(allData.filter((r: any) => r.type === "tv").map((r: any) => r.show_id))];

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
        } else {
          console.error(`Failed to fetch movie ${movieId}: ${res.status}`);
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
        } else {
          console.error(`Failed to fetch show ${showId}: ${res.status}`);
        }
      } catch (error) {
        console.error(`Failed to fetch poster for show ${showId}:`, error);
      }
    }

    // Transform data to match frontend Review interface
    const reviews = allData.map((item: any) => {
      const posterData = posterMap.get(`${item.type}_${item.contentId}`) || { posterUrl: "", title: "Untitled" };
      return {
        id: item.id,
        author: item.profiles?.username || "Anonymous",
        avatar: item.profiles?.avatar_url,
        rating: item.rating,
        content: item.review || "",
        date: new Date(item.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        likes: 0,
        movieId: item.contentId,
        movieTitle: posterData.title,
        movieType: item.type as "movie" | "tv",
        moviePoster: posterData.posterUrl,
      };
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
