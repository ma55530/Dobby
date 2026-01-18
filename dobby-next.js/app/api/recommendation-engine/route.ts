/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
   isBadMovie,
   isBadShow,
   fetchMissingDetails,
   findBetterSimilar,
} from "./fbs.functions";

// --- Main Handler ---

export async function GET(request: Request) {
   try {
      const supabase = await createClient();
      const {
         data: { user },
         error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const userId = user.id;
      const url = new URL(request.url);
      const limit = Math.min(
         parseInt(url.searchParams.get("limit") || "20", 10),
         100,
      );
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const headers = {
         cookie: request.headers.get("cookie") ?? "",
         accept: "application/json",
      };

      // 1. Get Top IDs from Embeddings (RPC)
      const fetchLimit = limit;
      const [{ data: movieRows }, { data: showRows }] = await Promise.all([
         supabase.rpc("get_top_movies_for_user", {
            p_user_id: userId,
            p_limit: fetchLimit,
            p_offset: offset,
         }),
         supabase.rpc("get_top_shows_for_user", {
            p_user_id: userId,
            p_limit: fetchLimit,
            p_offset: offset,
         }),
      ]);

      const movieIds = (movieRows || []).map(
         (r: any) => r.movie_id,
      ) as number[];
      const showIds = (showRows || []).map((r: any) => r.show_id) as number[];

      // 2. Resolve Full Objects (Local DB -> TMDB)
      // Helper to resolve generic items
      const resolveItems = async (ids: number[], table: "movies" | "shows") => {
         // A. Fetch from Local Cache
         // Note: Assumes table has 'tmdb_id' column matching the IDs
         const { data: local } = await supabase
            .from(table)
            .select("*")
            .in("tmdb_id", ids);
         const localMap = new Map(local?.map((i: any) => [i.tmdb_id, i]));

         // B. Fetch Missing
         const missingIds = ids.filter((id) => !localMap.has(id));
         const fetched = await fetchMissingDetails<any>(
            missingIds,
            table,
            request.url,
            headers,
         );

         // C. Combine (maintaining order is handled later if needed, here we just need the pool)
         return [...(local || []), ...fetched];
      };

      const [allMovies, allShows] = await Promise.all([
         resolveItems(movieIds, "movies"),
         resolveItems(showIds, "shows"),
      ]);

      // 3. Filter & Replace Bad Items Parallel
      const processItems = async (
         items: any[],
         type: "movies" | "shows",
         checkBad: (i: any) => boolean,
      ) => {
         return Promise.all(
            items.map(async (item) => {
               if (checkBad(item)) {
                  const better = await findBetterSimilar(
                     item.id ?? item.tmdb_id,
                     type,
                     request.url,
                     headers,
                     checkBad,
                  );
                  return better || null; // Drop if no better option
               }
               return item;
            }),
         );
      };

      const [finalMovies, finalShows] = await Promise.all([
         processItems(allMovies, "movies", isBadMovie),
         processItems(allShows, "shows", isBadShow),
      ]);

      // 4. Save Recommendations
      // Clean, dedup, and slice to original limit
      const saveRecs = async (
         items: any[],
         table: "movie_recommendations" | "show_recommendations",
         col: "movie_id" | "show_id",
      ) => {
         const valid = items.filter(Boolean);
         const unique = new Map();
         // Use TMDB ID as key for deduplication to handle mix of local/fetched objects
         valid.forEach((i) => unique.set(i.tmdb_id ?? i.id, i));

         // Take only the requested amount
         const sliced = Array.from(unique.values()).slice(0, limit);

         // Ensure we save the TMDB ID, not the internal UUID/ID from local DB
         const payload = sliced.map((i) => ({
            user_id: userId,
            [col]: i.tmdb_id ?? i.id,
            created_at: new Date().toISOString(), // Update timestamp to move to top
         }));

         if (payload.length > 0) {
            // Only delete previous recommendations if this is the first batch (offset 0)
            if (offset === 0) {
               await supabase.from(table).delete().eq("user_id", userId);
            }
            // Upsert (update if exists) to ensure created_at is refreshed
            await supabase
               .from(table)
               .upsert(payload, { onConflict: "user_id, " + col });
         }
         return sliced.length;
      };

      const [movieCount, showCount] = await Promise.all([
         saveRecs(finalMovies, "movie_recommendations", "movie_id"),
         saveRecs(finalShows, "show_recommendations", "show_id"),
      ]);

      return NextResponse.json({
         status: "success",
         count: { movies: movieCount, shows: showCount },
      });
   } catch (err: any) {
      console.error("Recommendation Engine Error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
   }
}
