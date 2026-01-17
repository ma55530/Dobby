/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

// TMDB Genre IDs to names mapping
const GENRE_MAP: Record<number, string> = {
   28: "Action",
   12: "Adventure",
   16: "Animation",
   35: "Comedy",
   80: "Crime",
   99: "Documentary",
   18: "Drama",
   10751: "Family",
   14: "Fantasy",
   36: "History",
   27: "Horror",
   10402: "Music",
   9648: "Mystery",
   10749: "Romance",
   878: "Science Fiction",
   10770: "TV Movie",
   53: "Thriller",
   10752: "War",
   37: "Western",
   10759: "Action & Adventure",
   10762: "Kids",
   10763: "News",
   10764: "Reality",
   10765: "Sci-Fi & Fantasy",
   10766: "Soap",
   10767: "Talk",
   10768: "War & Politics",
};

export async function GET(request: Request) {
   const supabase = await createClient();

   // Get session
   const {
      data: { user },
      error: sessionError,
   } = await supabase.auth.getUser();
   if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

  try {
    // Try to get favorite genres from request query params (sent from frontend with localStorage data)
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get('favorite_genres');
    let favoriteGenresFromClient: string[] = [];
    
    if (genresParam) {
      try {
        const genreIds = JSON.parse(genresParam);
        if (Array.isArray(genreIds)) {
          favoriteGenresFromClient = genreIds
            .map((id: number) => GENRE_MAP[id])
            .filter(Boolean);
        }
      } catch (e) {
        console.error('Failed to parse favorite_genres param:', e);
      }
    }
    
    const { data: movieRatings, error: movieRatingsError } = await supabase
      .from('rating')
      .select('movie_id, rating, created_at')
      .eq('user_id', user.id)
      .not('rating', 'is', null)
      .not('movie_id', 'is', null)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4)

    if (movieRatingsError) {
      console.error('Movie ratings error:', movieRatingsError)
    }

    const { data: showRatings, error: showRatingsError } = await supabase
      .from('rating')
      .select('show_id, rating, created_at')
      .eq('user_id', user.id)
      .not('rating', 'is', null)
      .not('show_id', 'is', null)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4)

    if (showRatingsError) {
      console.error('Show ratings error:', showRatingsError)
    }

    const movieIds = movieRatings?.map(item => item.movie_id).filter(Boolean) || []
    const showIds = showRatings?.map(item => item.show_id).filter(Boolean) || []

    // Fetch movie details from TMDB
    const topMoviesPromise = Promise.all(
      movieIds.map(async (movieId, index) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}`, get_options);
          if (res.ok) {
            const movie = await res.json();
            return {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path || null,
              genres: movie.genres || [],
              rating: movieRatings?.[index]?.rating ?? null
            };
          }
        } catch (err) {
          console.error(`Error fetching movie ${movieId}:`, err);
        }
        return null;
      })
    );

    // Fetch show details from TMDB
    const topShowsPromise = Promise.all(
      showIds.map(async (showId, index) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}`, get_options);
          if (res.ok) {
            const show = await res.json();
            return {
              id: show.id,
              name: show.name,
              poster_path: show.poster_path || null,
              genres: show.genres || [],
              rating: showRatings?.[index]?.rating ?? null
            };
          }
        } catch (err) {
          console.error(`Error fetching show ${showId}:`, err);
        }
        return null;
      })
    );

    const [fetchedMovies, fetchedShows] = await Promise.all([topMoviesPromise, topShowsPromise]);

    const topMovies = fetchedMovies.filter(m => m !== null) as any[];
    const topShows = fetchedShows.filter(s => s !== null) as any[];

      // Calculate favorite genres from all watched content (if not provided by client)
      let favoriteGenres = favoriteGenresFromClient;

      // If no genres from client, try fetching from user_genre_preferences table
      if (favoriteGenres.length === 0) {
         const { data: userGenrePrefs } = await supabase
            .from("user_genre_preferences")
            .select("genre")
            .eq("user_id", user.id);

         if (userGenrePrefs && userGenrePrefs.length > 0) {
            favoriteGenres = userGenrePrefs
               .map((p: any) => p.genre) // Ensure we get the genre name string
               .filter(Boolean);
         }
      }

      if (favoriteGenres.length === 0) {
         const genreCount: Record<string, number> = {};

         [...topMovies, ...topShows].forEach((item) => {
            const genres = item.genres as Array<{ id: number; name: string }>;
            genres.forEach((genre) => {
               const genreName = genre.name || GENRE_MAP[genre.id] || "Unknown";
               genreCount[genreName] = (genreCount[genreName] || 0) + 1;
            });
         });

         // Get top 5 genres from watchlist as fallback
         favoriteGenres = Object.entries(genreCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([genre]) => genre);
      }

      return NextResponse.json({
         favoriteGenres,
         topMovies: topMovies.slice(0, 4),
         topShows: topShows.slice(0, 4),
      });
   } catch (error) {
      console.error("Profile stats error:", error);
      return NextResponse.json(
         {
            favoriteGenres: [],
            topMovies: [],
            topShows: [],
         },
         { status: 200 } // Return empty stats instead of error
      );
   }
}
