import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FoldInRequest } from "@/lib/types/DS_API/Fold-in-Request";
import {
   isBadMovie,
   isBadShow,
   fetchMissingDetails,
   findBetterSimilar,
} from "../../recommendation-engine/fbs.functions";
import { getGenreKeyByName, getGenreNameByKey, getGenreNameById } from "@/lib/config/genres";

export async function POST(request: Request) {
   console.log("[fold-in] Received fold-in request.");
   const supabase = await createClient();
   const {
      data: { user },
      error: sessionError,
   } = await supabase.auth.getUser();

   if (sessionError || !user) {
      console.log("[fold-in] Unauthorized access attempt.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   let payload: FoldInRequest;
   try {
      payload = await request.json();
      console.log("[fold-in] Received payload:", payload);
   } catch {
      console.log("[fold-in] Invalid JSON payload.");
      return NextResponse.json(
         { error: "Invalid JSON payload" },
         { status: 400 },
      );
   }

   const { selectedGenres } = payload;
   if (!Array.isArray(selectedGenres) || selectedGenres.length === 0) {
      console.log("[fold-in] selectedGenres missing or empty:", selectedGenres);
      return NextResponse.json(
         {
            error: "selectedGenres must be a non-empty array of genre names or model keys",
         },
         { status: 400 },
      );
   }

   // Capture values before returning response
   const cookieHeader = request.headers.get("cookie") ?? "";
   // Calculate base URL safely
   const baseUrl = request.url ? request.url.split("/api")[0] : "";

   // Set loading flag immediately (async, but we await this quick update)
   await supabase.auth.updateUser({
      data: { loading_recommendations: true },
   });

   // Start async process
   (async () => {
      try {
         const normalizedSelectedKeys = selectedGenres
            .map((g) => getGenreKeyByName(g) ?? g)
            .filter((g): g is string => Boolean(g));

         const userGenreNames = selectedGenres
            .map((g) => getGenreNameByKey(g) ?? g)
            .filter((name): name is string => Boolean(name));

         const userGenres = new Set(userGenreNames);

         // Update persistent user preferences so the "Favorite Genres" UI stays in sync
         // with what was just used to calculate the embedding.
         if (selectedGenres.length > 0) {
            console.log("[fold-in] Async: Updating user_genre_preferences...");
            // Clear old
            await supabase
               .from("user_genre_preferences")
               .delete()
               .eq("user_id", user.id);

            // Insert new
            if (userGenreNames.length > 0) {
               const prefs = userGenreNames.map((name) => ({
                  user_id: user.id,
                  genre: name,
               }));
               const { error: prefError } = await supabase
                  .from("user_genre_preferences")
                  .insert(prefs);

               if (prefError) {
                  console.error(
                     "[fold-in] Async: Error updating user_genre_preferences:",
                     prefError,
                  );
               } else {
                  console.log(
                     "[fold-in] Async: user_genre_preferences updated.",
                  );
               }
            } else {
               console.warn(
                  "[fold-in] Async: No mapped genre names to persist.",
               );
            }
         }

         // Fetch latest genre layer from Supabase
         console.log(
            "[fold-in] Fetching latest genre layer from Supabase for async process...",
         );
         const { data: model, error: modelError } = await supabase
            .from("genre_layers")
            .select("name, genre_names, weight, bias")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

         if (modelError || !model) {
            console.error(
               "[fold-in] Error fetching genre layer in async process:",
               modelError,
            );
            return;
         }

         console.log("[fold-in] Loaded genre layer:", model.name);
         const genre_names: string[] = model.genre_names;
         const W: number[][] = model.weight;
         const b: number[] | undefined = model.bias;

         // Build name->index map
         const nameToIdx = new Map<string, number>();
         genre_names.forEach((g, i) => nameToIdx.set(g, i));

         const selectedIdxs: number[] = [];
         for (const g of normalizedSelectedKeys) {
            const idx = nameToIdx.get(g);
            if (typeof idx === "number") selectedIdxs.push(idx);
         }

         if (selectedIdxs.length === 0) {
            console.error("[fold-in] Async: No matching genres found.");
            // Reset flags?
            await supabase.auth.updateUser({
               data: { loading_recommendations: false },
            });
            return;
         }

         const nFactors = W.length;
         const emb = new Array<number>(nFactors).fill(0);
         for (const j of selectedIdxs) {
            for (let i = 0; i < nFactors; i++) {
               emb[i] += W[i][j];
            }
         }
         const count = selectedIdxs.length;
         for (let i = 0; i < nFactors; i++) {
            emb[i] = emb[i] / count;
            if (b && b.length === nFactors) emb[i] += b[i];
            if (!Number.isFinite(emb[i])) emb[i] = 0;
         }

         console.log("[fold-in] Async: Calculated embedding.");

         // Upsert into user_embeddings
         const { error: upsertError } = await supabase
            .from("user_embeddings")
            .upsert({ user_id: user.id, embedding: emb })
            .select("*");

         if (upsertError) {
            console.error(
               "[fold-in] Async: Error upserting embedding:",
               upsertError,
            );
            return;
         }

         console.log(
            "[fold-in] Async: Embedding upserted. Starting FBS generation...",
         );

         // --- FBS Generation Logic (Inlined from recommendation-engine) ---
         const limit = 20;
         const fetchLimit = limit * 3;
         const headers = { cookie: cookieHeader, accept: "application/json" };

         const [{ data: movieRows }, { data: showRows }] = await Promise.all([
            supabase.rpc("get_top_movies_for_user", {
               p_user_id: user.id,
               p_limit: fetchLimit,
               p_offset: 0,
            }),
            supabase.rpc("get_top_shows_for_user", {
               p_user_id: user.id,
               p_limit: fetchLimit,
               p_offset: 0,
            }),
         ]);

         const movieIds = (movieRows || []).map(
            (r: any) => r.movie_id,
         ) as number[];
         const showIds = (showRows || []).map(
            (r: any) => r.show_id,
         ) as number[];

         const resolveItems = async (
            ids: number[],
            table: "movies" | "shows",
         ) => {
            const { data: local } = await supabase
               .from(table)
               .select("*")
               .in("tmdb_id", ids);
            const localMap = new Map(local?.map((i: any) => [i.tmdb_id, i]));
            const missingIds = ids.filter((id) => !localMap.has(id));

            const fetched = await fetchMissingDetails<any>(
               missingIds,
               table,
               baseUrl,
               headers,
            );
            return [...(local || []), ...fetched];
         };

         const [allMovies, allShows] = await Promise.all([
            resolveItems(movieIds, "movies"),
            resolveItems(showIds, "shows"),
         ]);

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
                        baseUrl,
                        headers,
                        checkBad,
                     );
                     return better || item;
                  }
                  return item;
               }),
            );
         };

         const [finalMoviesRaw, finalShowsRaw] = await Promise.all([
            processItems(allMovies, "movies", isBadMovie),
            processItems(allShows, "shows", isBadShow),
         ]);

            const fetchPopular = async (
               type: "movies" | "shows",
               needed: number,
            ) => {
               const results: any[] = [];
               let page = 1;
               while (results.length < needed && page <= 2) {
                  try {
                     const res = await fetch(
                        new URL(`/api/${type}/popular?page=${page}`, baseUrl).toString(),
                        { headers },
                     );
                     if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) results.push(...data);
                     }
                  } catch (err) {
                     console.error(`[fold-in] Failed to fetch popular ${type}:`, err);
                  }
                  page += 1;
               }
               return results;
            };

         const extractGenreNames = (item: any) => {
            const names: string[] = [];
            if (Array.isArray(item?.genres)) {
               item.genres.forEach((g: any) => {
                  if (typeof g === "string") names.push(g);
                  else if (g?.name) names.push(g.name);
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
                     const mapped = getGenreNameById(id) ?? null;
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
            if (typeof item?.rating_average === "number")
               return item.rating_average;
            return 0;
         };

         // Fuzzy membership functions for cold-start scoring
         const fuzzyMemberships = (x: number) => {
            const clamp = (v: number) => Math.max(0, Math.min(1, v));
            const low = x <= 0.2 ? 1 : x <= 0.5 ? (0.5 - x) / 0.3 : 0;
            const mid =
               x <= 0.2
                  ? 0
                  : x <= 0.5
                    ? (x - 0.2) / 0.3
                    : x <= 0.8
                      ? (0.8 - x) / 0.3
                      : 0;
            const high = x <= 0.5 ? 0 : x <= 0.8 ? (x - 0.5) / 0.3 : 1;
            return { low: clamp(low), mid: clamp(mid), high: clamp(high) };
         };

         // Fuzzy inference with full 3x3 rule matrix
         const fuzzyScore = (genreRatio: number, popScore: number) => {
            const g = fuzzyMemberships(genreRatio);
            const p = fuzzyMemberships(popScore);
            const rules = [
               { w: Math.min(g.high, p.high), s: 1.0 },  // High genre + High popularity = Excellent
               { w: Math.min(g.high, p.mid), s: 0.9 },   // High genre + Mid popularity = Very Good
               { w: Math.min(g.mid, p.high), s: 0.8 },   // Mid genre + High popularity = Good
               { w: Math.min(g.mid, p.mid), s: 0.6 },    // Mid genre + Mid popularity = Okay
               { w: Math.min(g.high, p.low), s: 0.5 },   // High genre + Low popularity = Decent (hidden gem)
               { w: Math.min(g.low, p.high), s: 0.4 },   // Low genre + High popularity = Fair
               { w: Math.min(g.mid, p.low), s: 0.3 },    // Mid genre + Low popularity = Poor
               { w: Math.min(g.low, p.mid), s: 0.2 },    // Low genre + Mid popularity = Very Poor
               { w: Math.min(g.low, p.low), s: 0.1 },    // Low genre + Low popularity = Lowest priority
            ];
            const totalWeight = rules.reduce((sum, r) => sum + r.w, 0) || 1;
            const weighted = rules.reduce((sum, r) => sum + r.w * r.s, 0);
            return weighted / totalWeight;
         };

         const scoreAndSort = (items: any[]) => {
            const cleaned = items.filter(Boolean);
            const maxPop = Math.max(1, ...cleaned.map(getPopularity));
            const hasGenrePrefs = userGenres.size > 0;
            const jitter = 0.008;

            // Cold-start weights: prioritize genre matching more heavily
            // since we don't have embedding rank from user history
            const baseWeight = hasGenrePrefs ? 0.15 : 0.4;
            const fuzzyWeight = hasGenrePrefs ? 0.85 : 0.6;

            const scored = cleaned.map((item, idx) => {
               const baseScore = 1 - idx / Math.max(1, cleaned.length - 1);
               const popScore = getPopularity(item) / maxPop;
               const itemGenres = extractGenreNames(item);
               const matchCount = itemGenres.filter((g) => userGenres.has(g))
                  .length;
               const genreRatio =
                  userGenres.size > 0 ? matchCount / userGenres.size : 0;

               const fuzzy = hasGenrePrefs
                  ? fuzzyScore(genreRatio, popScore)
                  : popScore;

               const score =
                  baseWeight * baseScore +
                  fuzzyWeight * fuzzy +
                  Math.random() * jitter;

               return { item, score };
            });

            scored.sort((a, b) => b.score - a.score);
            return scored.map((s) => s.item);
         };

         const finalMovies = scoreAndSort(finalMoviesRaw);
         const finalShows = scoreAndSort(finalShowsRaw);

         const saveRecs = async (
            items: any[],
            table: "movie_recommendations" | "show_recommendations",
            col: "movie_id" | "show_id",
         ) => {
            const valid = items.filter(Boolean);
            const unique = new Map();
            valid.forEach((i) => unique.set(i.tmdb_id ?? i.id, i));

            if (unique.size < limit) {
               const needed = limit - unique.size;
               const popular = await fetchPopular(
                  table === "movie_recommendations" ? "movies" : "shows",
                  needed,
               );
               popular.forEach((i: any) => unique.set(i.tmdb_id ?? i.id, i));
            }

            const sliced = Array.from(unique.values()).slice(0, limit);
            const payload = sliced.map((i) => ({
               user_id: user.id,
               [col]: i.tmdb_id ?? i.id,
               created_at: new Date().toISOString(),
            }));
            if (payload.length > 0) {
               await supabase.from(table).delete().eq("user_id", user.id);
               await supabase.from(table).insert(payload);
            }
            return sliced.length;
         };

         await Promise.all([
            saveRecs(finalMovies, "movie_recommendations", "movie_id"),
            saveRecs(finalShows, "show_recommendations", "show_id"),
         ]);

         console.log(
            "[fold-in] Async: FBS generation complete. Updating user flags.",
         );

         // Complete!
         await supabase.auth.updateUser({
            data: { loading_recommendations: false },
         });
      } catch (err) {
         console.error("[fold-in] Async Error:", err);
         // Reset flags on error?
         await supabase.auth.updateUser({
            data: { loading_recommendations: false }, // Stop loading indicator regardless
         });
      }
   })();

   // Return immediately to client
   return NextResponse.json({ ok: true, status: "processing" });
}
