/* eslint-disable @typescript-eslint/no-explicit-any */ import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Show } from "@/lib/types/Show";

// Global cache that persists across requests - per user
const userShowCaches: Record<string, Record<number, Show>> = {};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData?.session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = sessionData.session.user.id;
    const url = new URL(request.url);
    const requestedLimit = Math.min(
      parseInt(url.searchParams.get("limit") || "20", 10),
      100
    );

    // 1. Get Recommended IDs
    const { data: recs } = await supabase
      .from("show_recommendations")
      .select("show_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(requestedLimit);

    if (!recs || recs.length === 0) return NextResponse.json([]);

    const showIds = recs.map((r) => r.show_id);

    // Initialize user cache if not exists
    if (!userShowCaches[userId]) {
      userShowCaches[userId] = {};
    }
    const userCache = userShowCaches[userId];

    // Check which shows are missing from cache
    const missingIds = showIds.filter((id) => !userCache[id]);

    // Fetch missing shows from TMDB API
    if (missingIds.length > 0) {
      const headers = {
        cookie: request.headers.get("cookie") || "",
        accept: "application/json",
      };

      const fetched = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const res = await fetch(
              new URL(`/api/shows/${id}`, request.url).toString(),
              { headers }
            );
            if (res.ok) {
              const show = (await res.json()) as Show;
              return { id, show };
            }
          } catch {
            return null;
          }
          return null;
        })
      );
      fetched.forEach((item) => {
        if (item) userCache[item.id] = item.show;
      });
    }

    // 5. Construct Final List (Preserving Order) from cache
    const finalOrdered = showIds
      .map((id) => userCache[id])
      .filter((s): s is Show => Boolean(s));

    return NextResponse.json(finalOrdered);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
