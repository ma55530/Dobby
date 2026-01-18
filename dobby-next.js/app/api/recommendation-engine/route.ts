/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenreNameById } from "@/lib/config/genres";
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
         100
      );
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const headers = {
         cookie: request.headers.get("cookie") ?? "",
         accept: "application/json",
      };

      const { data: userGenrePrefs } = await supabase
         .from("user_genre_preferences")
         .select("genre")
         .eq("user_id", userId);
      const userGenres = new Set(
         (userGenrePrefs || []).map((p: any) => p.genre).filter(Boolean)
      );

      // 1. Get Top IDs from Embeddings (RPC)
      // Fetch 3x the limit to allow re-ranking with genre/popularity and add mild randomness
      const fetchLimit = limit * 3;
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

      const movieIds = (movieRows || []).map((r: any) => r.movie_id) as number[];
      const showIds = (showRows || []).map((r: any) => r.show_id) as number[];

      const movieRankMap = new Map<number, number>();
      (movieRows || []).forEach((row: any, idx: number) => {
         if (typeof row?.movie_id === "number") movieRankMap.set(row.movie_id, idx);
      });
      const showRankMap = new Map<number, number>();
      (showRows || []).forEach((row: any, idx: number) => {
         if (typeof row?.show_id === "number") showRankMap.set(row.show_id, idx);
      });

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
            headers
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
         checkBad: (i: any) => boolean
      ) => {
         return Promise.all(
            items.map(async (item) => {
               if (checkBad(item)) {
                  const better = await findBetterSimilar(
                     item.id ?? item.tmdb_id,
                     type,
                     request.url,
                     headers,
                     checkBad
                  );
                  return better || null; // Drop if no better option
               }
               return item;
            })
         );
      };

      const [finalMoviesRaw, finalShowsRaw] = await Promise.all([
         processItems(allMovies, "movies", isBadMovie),
         processItems(allShows, "shows", isBadShow),
      ]);

      const extractGenreNames = (item: any) => {
         const names: string[] = [];
         if (Array.isArray(item?.genres)) {
            item.genres.forEach((g: any) => {
               if (typeof g === "string") names.push(g);
               else if (g?.name) names.push(g.name);
               else if (typeof g?.id === "number") {
                  const mapped = getGenreNameById(g.id);
                  if (mapped) names.push(mapped);
               }
            });
         }
         if (Array.isArray(item?.genre)) {
            item.genre.forEach((g: any) => {
               if (typeof g === "string") names.push(g);
            });
         }
         if (Array.isArray(item?.genre_ids)) {
            item.genre_ids.forEach((id: any) => {
               if (typeof id === "number") {
                  const mapped = getGenreNameById(id);
                  if (mapped) names.push(mapped);
               }
            });
         }
         return Array.from(new Set(names));
      };

      const getPopularity = (item: any) => {
         if (typeof item?.popularity === "number") return item.popularity;
         if (typeof item?.vote_average === "number") {
            const voteCount =
               typeof item?.vote_count === "number" ? item.vote_count : 0;
            return item.vote_average * Math.log10(voteCount + 1);
         }
         if (typeof item?.rating_average === "number") return item.rating_average;
         return 0;
      };

      const scoreAndSort = (
         items: any[],
         rankMap: Map<number, number>
      ) => {
         const cleaned = items.filter(Boolean);
         const maxPop = Math.max(1, ...cleaned.map(getPopularity));
         const maxRank = Math.max(1, rankMap.size - 1);

         const hasGenrePrefs = userGenres.size > 0;
         const baseWeight = hasGenrePrefs ? 0.2 : 0.4;
         const popularityWeight = hasGenrePrefs ? 0.35 : 0.6;
         const genreWeight = hasGenrePrefs ? 0.45 : 0;
         const jitter = 0.008;

         const scored = cleaned.map((item) => {
            const itemId = item.tmdb_id ?? item.id;
            const rank =
               typeof itemId === "number" ? rankMap.get(itemId) : undefined;
            const baseScore =
               typeof rank === "number" ? 1 - rank / maxRank : 0;

            const popScore = getPopularity(item) / maxPop;
            const itemGenres = extractGenreNames(item);
            const matchCount = itemGenres.filter((g) => userGenres.has(g))
               .length;
            const genreScore =
               userGenres.size > 0 ? matchCount / userGenres.size : 0;

            const score =
               baseWeight * baseScore +
               popularityWeight * popScore +
               genreWeight * genreScore +
               Math.random() * jitter;

            return { item, score };
         });

         scored.sort((a, b) => b.score - a.score);
         return scored.map((s) => s.item);
      };

      const finalMovies = scoreAndSort(finalMoviesRaw, movieRankMap);
      const finalShows = scoreAndSort(finalShowsRaw, showRankMap);

      // 4. Save Recommendations
      // Clean, dedup, and slice to original limit
      const saveRecs = async (
         items: any[],
         table: "movie_recommendations" | "show_recommendations",
         col: "movie_id" | "show_id"
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
            // Always delete previous recommendations before inserting a new batch
            await supabase.from(table).delete().eq("user_id", userId);
            await supabase.from(table).insert(payload);
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
