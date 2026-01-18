import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FoldInRequest } from "@/lib/types/DS_API/Fold-in-Request";
import {
   isBadMovie,
   isBadShow,
   fetchMissingDetails,
   findBetterSimilar,
} from "../../recommendation-engine/fbs.functions";
import {
   getGenreKeyByName,
   getGenreNameByKey,
} from "@/lib/config/genres";

export async function POST(request: Request) {
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
         { status: 400 }
      );
   }

   const { selectedGenres } = payload;
   if (!Array.isArray(selectedGenres) || selectedGenres.length === 0) {
      console.log("[fold-in] selectedGenres missing or empty:", selectedGenres);
      return NextResponse.json(
         {
            error:
               "selectedGenres must be a non-empty array of genre names or model keys",
         },
         { status: 400 }
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
            const normalizedKeys = selectedGenres
               .map((g) => getGenreKeyByName(g) ?? g)
               .filter((g): g is string => Boolean(g));

            const preferenceNames = normalizedKeys
               .map((key) => getGenreNameByKey(key))
               .filter((name): name is string => Boolean(name));

            if (preferenceNames.length > 0) {
               const prefs = preferenceNames.map((name) => ({
                  user_id: user.id,
                  genre: name,
               }));
               const { error: prefError } = await supabase
                  .from("user_genre_preferences")
                  .insert(prefs);

               if (prefError) {
                  console.error(
                     "[fold-in] Async: Error updating user_genre_preferences:",
                     prefError
                  );
               } else {
                  console.log(
                     "[fold-in] Async: user_genre_preferences updated."
                  );
               }
            } else {
               console.warn(
                  "[fold-in] Async: No mapped genre names to persist."
               );
            }
         }

         // Fetch latest genre layer from Supabase
         console.log(
            "[fold-in] Fetching latest genre layer from Supabase for async process..."
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
               modelError
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

         const normalizedSelectedKeys = selectedGenres
            .map((g) => getGenreKeyByName(g) ?? g)
            .filter((g): g is string => Boolean(g));

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
               upsertError
            );
            return;
         }

         console.log(
            "[fold-in] Async: Embedding upserted. Starting FBS generation..."
         );

         // --- FBS Generation Logic (Inlined from recommendation-engine) ---
         const limit = 20;
         const fetchLimit = limit;
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
            (r: any) => r.movie_id
         ) as number[];
         const showIds = (showRows || []).map(
            (r: any) => r.show_id
         ) as number[];

         const resolveItems = async (
            ids: number[],
            table: "movies" | "shows"
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
               headers
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
            checkBad: (i: any) => boolean
         ) => {
            return Promise.all(
               items.map(async (item) => {
                  if (checkBad(item)) {
                     // Similarly use baseUrl
                     const better = await findBetterSimilar(
                        item.id ?? item.tmdb_id,
                        type,
                        baseUrl,
                        headers,
                        checkBad
                     );
                     return better || null;
                  }
                  return item;
               })
            );
         };

         const [finalMoviesRaw, finalShowsRaw] = await Promise.all([
            processItems(allMovies, "movies", isBadMovie),
            processItems(allShows, "shows", isBadShow),
         ]);

         const saveRecs = async (
            items: any[],
            table: "movie_recommendations" | "show_recommendations",
            col: "movie_id" | "show_id"
         ) => {
            const valid = items.filter(Boolean);
            const unique = new Map();
            valid.forEach((i) => unique.set(i.tmdb_id ?? i.id, i));
            const sliced = Array.from(unique.values()).slice(0, limit);
            const payload = sliced.map((i) => ({
               user_id: user.id,
               [col]: i.tmdb_id ?? i.id,
            }));
            if (payload.length > 0) {
               await supabase.from(table).delete().eq("user_id", user.id);
               await supabase.from(table).insert(payload);
            }
         };

         await Promise.all([
            saveRecs(finalMoviesRaw, "movie_recommendations", "movie_id"),
            saveRecs(finalShowsRaw, "show_recommendations", "show_id"),
         ]);

         console.log(
            "[fold-in] Async: FBS generation complete. Updating user flags."
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
