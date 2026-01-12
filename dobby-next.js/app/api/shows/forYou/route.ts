import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Show } from "@/lib/types/Show";
import { Shows } from "@/lib/types/Shows";

// --- Configuration for Show Filtering ---
interface ShowFilterConfig {
  minVoteAverage: number;
  minFirstAirYear: number;
  midTierVoteAverage: number;
  midTierFirstAirYear: number;
}

const FILTER_CONFIG: ShowFilterConfig = {
  minVoteAverage: 5.1,
  minFirstAirYear: 1991,
  midTierVoteAverage: 7.4,
  midTierFirstAirYear: 2008,
};

function isBadShow(
  show: Show | Shows,
  config: ShowFilterConfig = FILTER_CONFIG
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

// Global cache that persists across requests - per user
const userShowCaches: Record<string, Record<number, Show>> = {};

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

    // Initialize user cache if not exists
    if (!userShowCaches[userId]) {
      userShowCaches[userId] = {};
    }

    const userCache = userShowCaches[userId];

    // Extract cookie OUTSIDE of unstable_cache
    const cookie = request.headers.get("cookie") ?? "";

    // Get recommended show IDs from database (pre-computed by AI)
    let { data: dbRecommendations } = await supabase
      .from("show_recommendations")
      .select("show_id, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(requestedLimit);

    // If empty, call RPC to populate recommendations
    if (!dbRecommendations || dbRecommendations.length === 0) {
      console.log("No recommendations found, calling refresh function...");

      const { error: refreshError } = await supabase.rpc(
        "refresh_show_recommendations",
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
        .from("show_recommendations")
        .select("show_id, updated_at")
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

    const dbShowIds = dbRecommendations.map((r) => r.show_id);

    console.log(`Processing ${dbShowIds.length} show IDs from database`);

    // Find which shows in cache are NO LONGER in DB recommendations
    const cachedIds = Object.keys(userCache).map(Number);
    const removedIds = cachedIds.filter((id) => !dbShowIds.includes(id));

    // Remove stale shows from cache (keep cache same size as DB)
    removedIds.forEach((id) => {
      delete userCache[id];
    });

    if (removedIds.length > 0) {
      console.log(`Removed ${removedIds.length} stale shows from cache`);
    }

    // Find which shows are NOT in cache
    const missingIds = dbShowIds.filter((id) => !userCache[id]);

    console.log(
      `Cache: ${Object.keys(userCache).length} shows | Missing: ${
        missingIds.length
      } shows`
    );

    // Only fetch missing shows from TMDB
    if (missingIds.length > 0) {
      const fetchOptions = {
        headers: { cookie, accept: "application/json" },
      };

      const fetches = missingIds.map((id) =>
        fetch(new URL(`/api/shows/${id}`, request.url).toString(), fetchOptions)
          .then(async (res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .catch(() => null)
      );

      const newShows = (await Promise.all(fetches)).filter((s): s is Show =>
        Boolean(s)
      );

      console.log(`Fetched ${newShows.length} new shows from TMDB`);

      // Add new shows to cache
      newShows.forEach((show) => {
        userCache[show.id] = show;
      });
    }

    // Get shows from cache in AI order
    const orderedShows = dbShowIds
      .map((id) => userCache[id])
      .filter((s): s is Show => Boolean(s));

    const fetchOptions = {
      headers: {
        cookie,
        accept: "application/json",
      },
    };

    // Filter out bad shows
    const processedShows = await Promise.all(
      orderedShows.map(async (show) => {
        if (isBadShow(show)) {
          const better = await findBetterSimilar(
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

    console.log(
      `Returning ${orderedShows.length} shows to client (Cache size: ${
        Object.keys(userCache).length
      })`
    );

    return NextResponse.json(orderedShows, { status: 200 });
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
): Promise<Show | null> {
  try {
    const similarRes = await fetch(
      new URL(`/api/shows/${id}/similar`, request.url).toString(),
      fetchOptions
    );
    if (similarRes.ok) {
      const similarShows: Shows[] = await similarRes.json();
      if (similarShows.length > 0) {
        // Filter out the original show just in case
        const candidates = similarShows.filter((s) => s.id !== id);

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            if (b.popularity !== a.popularity)
              return b.popularity - a.popularity;
            const yearA = parseInt(a.first_air_date?.split("-")[0] || "0");
            const yearB = parseInt(b.first_air_date?.split("-")[0] || "0");
            return yearB - yearA;
          });

          // Find the first candidate that is NOT a bad show
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
