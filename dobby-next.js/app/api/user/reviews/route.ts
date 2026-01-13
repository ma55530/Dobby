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
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Fetch user's movie ratings (only those with review_title - actual reviews, not comments)
    const { data: movieRatings, error: movieError } = await supabase
      .from("movie_ratings")
      .select("id, movie_id, rating, review, review_title, created_at, user_id, likes")
      .eq("user_id", user.id)
      .not("review_title", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (movieError) {
      console.error("Error fetching movie ratings:", movieError);
      return NextResponse.json({ error: "Failed to fetch movie ratings" }, { status: 500 });
    }

    // Fetch user's show ratings (only those with review_title - actual reviews, not comments)
    const { data: showRatings, error: showError } = await supabase
      .from("show_ratings")
      .select("id, show_id, rating, review, review_title, created_at, user_id, likes")
      .eq("user_id", user.id)
      .not("review_title", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (showError) {
      console.error("Error fetching show ratings:", showError);
      return NextResponse.json({ error: "Failed to fetch show ratings" }, { status: 500 });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single();

    // Fetch TMDB data for movies
    const movieIds = movieRatings?.map((r) => r.movie_id) || [];
    const posterMap: Record<number, { title: string; poster: string }> = {};

    if (movieIds.length > 0) {
      const posterPromises = movieIds.map(async (id) => {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/movie/${id}`,
            get_options
          );
          if (response.ok) {
            const movie: TmdbMovie = await response.json();
            return {
              id: movie.id,
              title: movie.title,
              poster: movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : "/placeholder-poster.png",
            };
          }
        } catch (err) {
          console.error(`Failed to fetch movie ${id}:`, err);
        }
        return null;
      });

      const posters = await Promise.all(posterPromises);
      posters.forEach((p) => {
        if (p) posterMap[p.id] = { title: p.title, poster: p.poster };
      });
    }

    // Fetch TMDB data for shows
    const showIds = showRatings?.map((r) => r.show_id) || [];
    const showPosterMap: Record<number, { title: string; poster: string }> = {};

    if (showIds.length > 0) {
      const showPosterPromises = showIds.map(async (id) => {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/tv/${id}`,
            get_options
          );
          if (response.ok) {
            const show: TmdbShow = await response.json();
            return {
              id: show.id,
              title: show.name,
              poster: show.poster_path
                ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                : "/placeholder-poster.png",
            };
          }
        } catch (err) {
          console.error(`Failed to fetch show ${id}:`, err);
        }
        return null;
      });

      const showPosters = await Promise.all(showPosterPromises);
      showPosters.forEach((p) => {
        if (p) showPosterMap[p.id] = { title: p.title, poster: p.poster };
      });
    }

    // Map movie ratings to reviews
    const movieReviews = (movieRatings || []).map((rating) => ({
      id: rating.id,
      author: profile?.username || "Unknown",
      avatar: profile?.avatar_url,
      rating: rating.rating,
      content: rating.review || "",
      date: new Date(rating.created_at).toLocaleDateString(),
      likes: rating.likes || 0,
      movieId: rating.movie_id,
      movieTitle: rating.review_title,
      movieType: "movie" as const,
      moviePoster: posterMap[rating.movie_id]?.poster,
      children: [],
    }));

    // Map show ratings to reviews
    const showReviews = (showRatings || []).map((rating) => ({
      id: rating.id,
      author: profile?.username || "Unknown",
      avatar: profile?.avatar_url,
      rating: rating.rating,
      content: rating.review || "",
      date: new Date(rating.created_at).toLocaleDateString(),
      likes: rating.likes || 0,
      movieId: rating.show_id,
      movieTitle: rating.review_title,
      movieType: "tv" as const,
      moviePoster: showPosterMap[rating.show_id]?.poster,
      children: [],
    }));

    // Combine and sort by date
    const allReviews = [...movieReviews, ...showReviews].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ reviews: allReviews.slice(0, limit) });
  } catch (err) {
    console.error("Error in user reviews endpoint:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
