import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Updates the user's latent vector (embedding) based on a new rating.
 * This implements a simple "Hill Climbing" or "Stochastic Gradient Descent" approach
 * where the user vector is nudged towards items they like.
 *
 * Formula: NewUserVector = OldUserVector + alpha * (ItemVector - OldUserVector)
 *
 * @param supabase Authenticated Supabase client
 * @param userId The ID of the user rating the item
 * @param itemId The TMDB ID of the item
 * @param itemType 'movie' or 'show'
 * @param rating The rating value (1-10) or star value converted to score
 */
export async function updateUserEmbedding(
   supabase: SupabaseClient,
   userId: string,
   itemId: number,
   itemType: "movie" | "show",
   rating: number,
   refreshConfig?: { origin: string; cookie: string },
) {
   try {
      // 1. Determine Learning Rate (alpha) and Direction
      // If rating > 6, we move towards. If rating < 5, we might move away or stay put.
      // For MVP, we only "learn" from positive interactions to avoid 'hiding' genres too aggressively.
      // Normalized rating (0 to 1): 5 stars = 1.0, 1 star = 0.0 -> assuming input is 0.5-5.0 or 1-10

      // Normalize rating to 0-10 scale if it comes in as 0-5
      const normalizedRating = rating <= 5 ? rating * 2 : rating;

      // Thresholds
      const LIKE_THRESHOLD = 6.0;

      // If neutral or bad, we skip updating for now to prevent "bubble" effects or instability
      if (normalizedRating < LIKE_THRESHOLD) {
         console.log(
            `[DobbySense] Rating ${normalizedRating} is below threshold. usage vector unchanged.`,
         );
         return;
      }

      // Alpha: How much we shift per rating.
      // 0.05 means it takes ~20 good movies to transition fully to a new genre.
      const ALPHA = 0.05;

      // 2. Fetch User's Current Embedding
      const { data: userData, error: userError } = await supabase
         .from("user_embeddings")
         .select("embedding")
         .eq("user_id", userId)
         .single();

      if (userError || !userData) {
         console.warn("[DobbySense] User embedding not found. Cannot update.");
         return;
      }

      const userVector: number[] = JSON.parse(userData.embedding);

      // 3. Fetch Item's Embedding
      // We first try to fetch by TMDB ID directly (most reliable when local cache is empty).
      // If that fails, we fall back to resolving TMDB -> internal ID and retry.
      const table = itemType === "movie" ? "movies" : "shows";
      const embeddingTable =
         itemType === "movie" ? "movie_embeddings" : "show_embeddings";
      const idCol = itemType === "movie" ? "movie_id" : "show_id";

      console.log(
         `[DobbySense] Fetching embedding for ${itemType} (TMDB: ${itemId})`,
      );

      let itemVector: number[] | null = null;

      // Step 1: Try direct embedding lookup by TMDB ID
      const { data: directRow, error: directError } = await supabase
         .from(embeddingTable)
         .select("embedding")
         .eq(idCol, itemId)
         .maybeSingle();

      if (directError) {
         console.error(
            `[DobbySense] Error fetching embedding by TMDB ID:`,
            directError,
         );
      }

      if (directRow?.embedding) {
         try {
            itemVector = JSON.parse(directRow.embedding);
            console.log(`[DobbySense] Vector found by TMDB ID.`);
         } catch (parseErr) {
            console.error(`[DobbySense] Error parsing vector:`, parseErr);
         }
      }

      // Step 2: Fallback to internal ID lookup when direct fetch fails
      if (!itemVector) {
         const { data: itemData, error: itemError } = await supabase
            .from(table)
            .select("id")
            .eq("tmdb_id", itemId)
            .maybeSingle();

         if (itemError) {
            console.error(
               `[DobbySense] Error fetching ${itemType} ID:`,
               itemError,
            );
            return;
         }

         if (!itemData) {
            console.warn(
               `[DobbySense] ${itemType} not found for TMDB ${itemId}`,
            );
            return;
         }

         const internalId = itemData.id;
         console.log(
            `[DobbySense] Resolved to Internal ID: ${internalId}. Fetching vector...`,
         );

         const { data: vectorRow, error: vectorError } = await supabase
            .from(embeddingTable)
            .select("embedding")
            .eq(idCol, internalId)
            .maybeSingle();

         if (vectorError) {
            console.error(
               `[DobbySense] Error fetching embedding:`,
               vectorError,
            );
            return;
         }

         if (vectorRow?.embedding) {
            try {
               itemVector = JSON.parse(vectorRow.embedding);
               console.log(`[DobbySense] Vector found by internal ID.`);
            } catch (parseErr) {
               console.error(`[DobbySense] Error parsing vector:`, parseErr);
            }
         }
      }

      if (!itemVector) {
         console.log(
            `[DobbySense] ${itemType} not in DobbySense database - skipping learning.`,
         );
         return;
      }

      // 4. Calculate New Vector
      // V_new = V_old + alpha * (V_item - V_old)
      if (userVector.length !== itemVector.length) {
         console.error("[DobbySense] Vector dimension mismatch.");
         return;
      }

      let totalShift = 0;
      const newVector = userVector.map((uVal, idx) => {
         const iVal = itemVector![idx];
         const delta = ALPHA * (iVal - uVal);
         totalShift += delta * delta;
         return uVal + delta;
      });

      console.log(
         `[DobbySense] Vector updated. Magnitude of shift: ${Math.sqrt(totalShift).toFixed(6)}`,
      );
      console.log(
         `[DobbySense] First 3 dims: [${userVector.slice(0, 3).map((n) => n.toFixed(3))}] -> [${newVector.slice(0, 3).map((n) => n.toFixed(3))}]`,
      );

      // 5. Save Back
      await supabase
         .from("user_embeddings")
         .update({
            embedding: JSON.stringify(newVector),
            updated_at: new Date().toISOString(),
         })
         .eq("user_id", userId);

      console.log(
         `[DobbySense] Updated user ${userId} embedding based on ${itemType} ${itemId}`,
      );

      // 6. Refresh Recommendations (Fetch with offset 0 deletes old recs)
      if (refreshConfig?.origin) {
         console.log("[DobbySense] Triggering recommendation refresh...");
         try {
            await fetch(
               `${refreshConfig.origin}/api/recommendation-engine?limit=20&offset=0`,
               {
                  headers: {
                     cookie: refreshConfig.cookie || "",
                  },
               },
            );
            console.log("[DobbySense] Recommendations refreshed successfully.");
         } catch (refreshError) {
            console.error(
               "[DobbySense] Failed to refresh recommendations:",
               refreshError,
            );
         }
      }
   } catch (e) {
      console.error("[DobbySense] Error updating user embedding:", e);
   }
}
