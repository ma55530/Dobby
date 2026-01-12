import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Movie } from "@/lib/types/Movie";
import { Movies } from "@/lib/types/Movies";

// --- Configuration for Movie Filtering ---
interface MovieFilterConfig {
  minVoteAverage: number;
  minReleaseYear: number;
  midTierVoteAverage: number;
  midTierReleaseYear: number;
}

const FILTER_CONFIG: MovieFilterConfig = {
  minVoteAverage: 5.1,
  minReleaseYear: 1991,
  midTierVoteAverage: 7.4,
  midTierReleaseYear: 2008,
};

function isBadMovie(
  movie: Movie | Movies,
  config: MovieFilterConfig = FILTER_CONFIG
): boolean {
  const yearStr = movie.release_date?.split("-")[0];
  const releaseYear = yearStr ? parseInt(yearStr) : 0;
  const safeYear = isNaN(releaseYear) ? 0 : releaseYear;

  return (
    movie.vote_average < config.minVoteAverage ||
    safeYear < config.minReleaseYear ||
    (movie.vote_average < config.midTierVoteAverage &&
      safeYear <= config.midTierReleaseYear)
  );
}

//Global cache that persists across requests - per user
const userMovieCaches: Record<string, Record<number, Movie>> = {};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError)
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );

    const userId = sessionData?.session?.user?.id;
    if (!userId)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(request.url);
    const requestedLimit = parseInt(url.searchParams.get("limit") || "20", 10);

    if (requestedLimit > 100) {
      return NextResponse.json({ error: "Limit too high" }, { status: 400 });
    }

    //Initialize user cache if not exists
    if (!userMovieCaches[userId]) {
      userMovieCaches[userId] = {};
    }

    const userCache = userMovieCaches[userId];

    //Extract cookie OUTSIDE of unstable_cache
    const cookie = request.headers.get("cookie") ?? "";

    //Get recommended movie IDs from database (pre-computed by AI)
    let { data: dbRecommendations } = await supabase
      .from("movie_recommendations")
      .select("movie_id, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(requestedLimit);

    //If empty, call RPC to populate recommendations
    if (!dbRecommendations || dbRecommendations.length === 0) {
      console.log("No recommendations found, calling refresh function...");

      const { error: refreshError } = await supabase.rpc(
        "refresh_movie_recommendations",
        {
          p_user_id: userId,
          p_limit: requestedLimit,
        }
      );

      if (refreshError) {
        console.error("Refresh error:", refreshError);
        return NextResponse.json(
          { error: "Failed to generate recommendations" },
          { status: 500 }
        );
      }

      // Retry fetching recommendations after refresh
      const { data: refreshedRecommendations } = await supabase
        .from("movie_recommendations")
        .select("movie_id, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(requestedLimit);

      if (!refreshedRecommendations || refreshedRecommendations.length === 0) {
        console.log("Still no recommendations after refresh");
        return NextResponse.json([], { status: 200 });
      }

      dbRecommendations = refreshedRecommendations;
      console.log(
        `Found ${dbRecommendations.length} recommendations after refresh`
      );
    }

    const dbMovieIds = dbRecommendations.map((r) => r.movie_id);

    console.log(`Processing ${dbMovieIds.length} movie IDs from database`);

    //Find which movies in cache are NO LONGER in DB recommendations
    const cachedIds = Object.keys(userCache).map(Number);
    const removedIds = cachedIds.filter((id) => !dbMovieIds.includes(id));

    //Remove stale movies from cache (keep cache same size as DB)
    removedIds.forEach((id) => {
      delete userCache[id];
    });

    if (removedIds.length > 0) {
      console.log(`Removed ${removedIds.length} stale movies from cache`);
    }

    //Find which movies are NOT in cache
    const missingIds = dbMovieIds.filter((id) => !userCache[id]);

    console.log(
      `Cache: ${Object.keys(userCache).length} movies | Missing: ${
        missingIds.length
      } movies`
    );

    //Only fetch missing movies from TMDB
    if (missingIds.length > 0) {
      const fetchOptions = {
        headers: { cookie, accept: "application/json" },
      };

      const fetches = missingIds.map((id) =>
        fetch(
          new URL(`/api/movies/${id}`, request.url).toString(),
          fetchOptions
        )
          .then(async (res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .catch(() => null)
      );

      const newMovies = (await Promise.all(fetches)).filter((m): m is Movie =>
        Boolean(m)
      );

      console.log(`Fetched ${newMovies.length} new movies from TMDB`);

      //Add new movies to cache
      newMovies.forEach((movie) => {
        userCache[movie.id] = movie;
      });
    }

    //Get movies from cache in AI order
    const orderedMovies = dbMovieIds
      .map((id) => userCache[id])
      .filter((m): m is Movie => Boolean(m));

    const fetchOptions = {
      headers: {
        cookie,
        accept: "application/json",
      },
    };

    //Filter out bad movies
    const processedMovies = await Promise.all(
      orderedMovies.map(async (movie) => {
        if (isBadMovie(movie)) {
          const better = await findBetterSimilar(
            movie.id,
            request,
            fetchOptions
          );
          if (better) return better;
          return null;
        }
        return movie;
      })
    );

    console.log(
      `Returning ${orderedMovies.length} movies to client (Cache size: ${
        Object.keys(userCache).length
      })`
    );

    return NextResponse.json(orderedMovies, { status: 200 });
  } catch (err: any) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}

async function findBetterSimilar(
  id: number,
  request: Request,
  fetchOptions: RequestInit
): Promise<Movie | null> {
  try {
    const similarRes = await fetch(
      new URL(`/api/movies/${id}/similar`, request.url).toString(),
      fetchOptions
    );
    if (similarRes.ok) {
      const similarMovies: Movies[] = await similarRes.json();
      if (similarMovies.length > 0) {
        // Filter out the original movie just in case
        const candidates = similarMovies.filter((m) => m.id !== id);

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            if (b.popularity !== a.popularity)
              return b.popularity - a.popularity;
            const yearA = parseInt(a.release_date?.split("-")[0] || "0");
            const yearB = parseInt(b.release_date?.split("-")[0] || "0");
            return yearB - yearA;
          });

          // Find the first candidate that is NOT a bad movie
          const bestMatch = candidates.find((m) => !isBadMovie(m));

          if (bestMatch) {
            const detailRes = await fetch(
              new URL(`/api/movies/${bestMatch.id}`, request.url).toString(),
              fetchOptions
            );
            if (detailRes.ok) {
              return (await detailRes.json()) as Movie;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error replacing movie:", e);
  }
  return null;
}
