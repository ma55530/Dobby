import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Show } from "@/lib/types/Show";
import { Shows } from "@/lib/types/Shows";

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

    const dbShowIds = (dbRecommendations ?? []).map((r) => r.show_id);

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
