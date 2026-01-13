import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Movie } from "@/lib/types/Movie";
import { Movies } from "@/lib/types/Movies";

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

    const dbMovieIds = (dbRecommendations ?? []).map((r) => r.movie_id);

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
