import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Movie } from "@/lib/types/Movie";
import { Movies } from "@/lib/types/Movies";
import { Show } from "@/lib/types/Show";
import { Shows } from "@/lib/types/Shows";

// --- Configuration for Movie Filtering ---
interface MovieFilterConfig {
  minVoteAverage: number;
  minReleaseYear: number;
  midTierVoteAverage: number;
  midTierReleaseYear: number;
}

const FILTER_MOVIE_CONFIG: MovieFilterConfig = {
  minVoteAverage: 5.1, // Movies below this rating are considered "bad"
  minReleaseYear: 1991, // Movies older than this are considered "bad"
  midTierVoteAverage: 7.4, // Movies below this rating...
  midTierReleaseYear: 2008, // ...AND older than this are also considered "bad"
};

// --- Configuration for Show Filtering ---
interface ShowFilterConfig {
  minVoteAverage: number;
  minFirstAirYear: number;
  midTierVoteAverage: number;
  midTierFirstAirYear: number;
}

const FILTER_SHOW_CONFIG: ShowFilterConfig = {
  minVoteAverage: 5.1,
  minFirstAirYear: 1991,
  midTierVoteAverage: 7.4,
  midTierFirstAirYear: 2008,
};

function isBadMovie(
  movie: Movie | Movies,
  config: MovieFilterConfig = FILTER_MOVIE_CONFIG
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

function isBadShow(
  show: Show | Shows,
  config: ShowFilterConfig = FILTER_SHOW_CONFIG
): boolean {
  const yearStr = show.first_air_date?.split("-")[0];
  const firstAirYear = yearStr ? parseInt(yearStr) : 0;
  const safeYear = isNaN(firstAirYear) ? 0 : firstAirYear;

  return (
    show.vote_average < config.minVoteAverage ||
    safeYear < config.minFirstAirYear ||
    (show.vote_average < config.midTierVoteAverage &&
      safeYear <= config.midTierFirstAirYear)
  );
}

async function findBetterSimilarMovie(
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

async function findBetterSimilarShow(
  id: number,
  request: Request,
  fetchOptions: RequestInit
): Promise<Show | null> {
  try {
    const similarRes = await fetch(
      new URL(`/api/shows/${id}/similar`, request.url).toString(),
      fetchOptions
    );
    if (similarRes.ok) {
      const similarShows: Shows[] = await similarRes.json();
      if (similarShows.length > 0) {
        const candidates = similarShows.filter((s) => s.id !== id);

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            if (b.popularity !== a.popularity)
              return b.popularity - a.popularity;
            const yearA = parseInt(a.first_air_date?.split("-")[0] || "0");
            const yearB = parseInt(b.first_air_date?.split("-")[0] || "0");
            return yearB - yearA;
          });

          const bestMatch = candidates.find((s) => !isBadShow(s));

          if (bestMatch) {
            const detailRes = await fetch(
              new URL(`/api/shows/${bestMatch.id}`, request.url).toString(),
              fetchOptions
            );
            if (detailRes.ok) {
              return (await detailRes.json()) as Show;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error replacing show:", e);
  }
  return null;
}

async function fetchMovieDetail(
  id: number,
  request: Request,
  fetchOptions: RequestInit
): Promise<Movie | null> {
  try {
    const res = await fetch(
      new URL(`/api/movies/${id}`, request.url).toString(),
      fetchOptions
    );
    if (res.ok) return (await res.json()) as Movie;
  } catch (e) {
    console.error("Error fetching movie detail:", e);
  }
  return null;
}

async function fetchShowDetail(
  id: number,
  request: Request,
  fetchOptions: RequestInit
): Promise<Show | null> {
  try {
    const res = await fetch(
      new URL(`/api/shows/${id}`, request.url).toString(),
      fetchOptions
    );
    if (res.ok) return (await res.json()) as Show;
  } catch (e) {
    console.error("Error fetching show detail:", e);
  }
  return null;
}

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
    const limitParam = url.searchParams.get("limit");
    const requestedLimit = limitParam ? parseInt(limitParam, 10) : 20;
    const fetchLimit = Math.min(requestedLimit, 100);

    const cookie = request.headers.get("cookie") ?? "";
    const fetchOptions = {
      headers: { cookie, accept: "application/json" },
    } as RequestInit;

    // Fetch top movies and shows for user via RPC
    const [
      { data: movieRows, error: movieRpcError },
      { data: showRows, error: showRpcError },
    ] = await Promise.all([
      supabase.rpc("get_top_movies_for_user", {
        p_user_id: userId,
        p_limit: fetchLimit,
      }),
      supabase.rpc("get_top_shows_for_user", {
        p_user_id: userId,
        p_limit: fetchLimit,
      }),
    ]);

    if (movieRpcError)
      return NextResponse.json(
        { error: movieRpcError.message },
        { status: 500 }
      );
    if (showRpcError)
      return NextResponse.json(
        { error: showRpcError.message },
        { status: 500 }
      );

    const movieIds = (movieRows || [])
      .map((row: any) => row.movie_id ?? row.id)
      .filter((id: number) => typeof id === "number");
    const showIds = (showRows || [])
      .map((row: any) => row.show_id ?? row.id)
      .filter((id: number) => typeof id === "number");

    // Fetch details
    const movieDetails = (
      await Promise.all(
        movieIds.map((id: number) =>
          fetchMovieDetail(id, request, fetchOptions)
        )
      )
    ).filter(Boolean) as Movie[];
    const showDetails = (
      await Promise.all(
        showIds.map((id: number) => fetchShowDetail(id, request, fetchOptions))
      )
    ).filter(Boolean) as Show[];

    // Replace bad movies/shows with better similars when possible
    const processedMovies = await Promise.all(
      movieDetails.map(async (movie) => {
        if (isBadMovie(movie)) {
          const better = await findBetterSimilarMovie(
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

    const processedShows = await Promise.all(
      showDetails.map(async (show) => {
        if (isBadShow(show)) {
          const better = await findBetterSimilarShow(
            show.id,
            request,
            fetchOptions
          );
          if (better) return better;
          return null;
        }
        return show;
      })
    );

    // Persist recommendations (replace existing for the user)
    if (processedMovies.length > 0) {
      const moviePayload = processedMovies
        .filter((m) => m !== null)
        .map((m) => ({
          user_id: userId,
          movie_id: m.id,
        }));
      if (moviePayload.length > 0) {
        await supabase
          .from("movie_recommendations")
          .delete()
          .eq("user_id", userId);
        await supabase.from("movie_recommendations").insert(moviePayload);
      }
    }

    if (processedShows.length > 0) {
      const showPayload = processedShows
        .filter((s) => s !== null)
        .map((s) => ({
          user_id: userId,
          show_id: s.id,
        }));
      await supabase
        .from("show_recommendations")
        .delete()
        .eq("user_id", userId);
      await supabase.from("show_recommendations").insert(showPayload);
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    console.error("FBS route error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
