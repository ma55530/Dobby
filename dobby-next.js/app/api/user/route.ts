import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/UserProfile";

const GENRE_MAP: Record<number, string> = {
   28: "Action",
   12: "Adventure",
   16: "Animation",
   35: "Comedy",
   80: "Crime",
   99: "Documentary",
   18: "Drama",
   10751: "Family",
   14: "Fantasy",
   36: "History",
   27: "Horror",
   10402: "Music",
   9648: "Mystery",
   10749: "Romance",
   878: "Science Fiction",
   10770: "TV Movie",
   53: "Thriller",
   10752: "War",
   37: "Western",
   10759: "Action & Adventure",
   10762: "Kids",
   10763: "News",
   10764: "Reality",
   10765: "Sci-Fi & Fantasy",
   10766: "Soap",
   10767: "Talk",
   10768: "War & Politics",
};

const ALLOWED_UPDATE_FIELDS = new Set([
   "username",
   "first_name",
   "last_name",
   "age",
   "avatar_url",
   "bio",
   "theme",
   "favorite_genres",
]);

export async function GET() {
   const supabase = await createClient();

   const {
      data: { user },
      error: userError,
   } = await supabase.auth.getUser();
   if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

   const profile = data as UserProfile | null;

   if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
   }
   if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
   }

   return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
   const supabase = await createClient();
   const {
      data: { user },
      error: userError,
   } = await supabase.auth.getUser();

   if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   let payload: Record<string, unknown>;
   try {
      payload = await request.json();
   } catch {
      return NextResponse.json(
         { error: "Invalid JSON payload" },
         { status: 400 }
      );
   }

   const updateData: Record<string, unknown> = {};
   for (const [key, value] of Object.entries(payload)) {
      if (!ALLOWED_UPDATE_FIELDS.has(key)) continue;
      if (value === undefined || value === null) {
         updateData[key] = null;
         continue;
      }
      if (key === "age") {
         const age = Number(value);
         if (!Number.isInteger(age) || age < 0) {
            return NextResponse.json({ error: "Invalid age" }, { status: 400 });
         }
         updateData.age = age;
         continue;
      }
      if (key === "theme" && typeof value === "string") {
         const normalized = value.toLowerCase();
         if (!["light", "dark"].includes(normalized)) {
            return NextResponse.json(
               { error: "Invalid theme" },
               { status: 400 }
            );
         }
         updateData.theme = normalized;
         continue;
      }
      if (key === "favorite_genres") {
         if (!Array.isArray(value)) {
            return NextResponse.json(
               { error: "favorite_genres must be an array" },
               { status: 400 }
            );
         }
         if (
            !value.every((id) => typeof id === "number" && Number.isInteger(id))
         ) {
            return NextResponse.json(
               { error: "favorite_genres must contain only integers" },
               { status: 400 }
            );
         }
         updateData.favorite_genres = value;
         continue;
      }
      if (typeof value !== "string") {
         return NextResponse.json(
            { error: `Invalid type for ${key}` },
            { status: 400 }
         );
      }
      const trimmed = value.trim();
      if (key === "username" && trimmed.length === 0) {
         return NextResponse.json(
            { error: "Username cannot be empty" },
            { status: 400 }
         );
      }
      updateData[key] = trimmed;
   }

   if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
         { error: "No valid fields provided" },
         { status: 400 }
      );
   }

   // Separate favorite_genres from profile update data
   const { favorite_genres, ...profileUpdateData } = updateData;

   // Update profiles table if there are profile fields
   if (Object.keys(profileUpdateData).length > 0) {
      if (typeof profileUpdateData.username === "string") {
         const { data: existingProfile, error: existingError } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", profileUpdateData.username)
            .neq("id", user.id)
            .maybeSingle();

         if (existingError) {
            return NextResponse.json(
               { error: existingError.message },
               { status: 400 }
            );
         }
         if (existingProfile) {
            return NextResponse.json(
               { error: "Username is already taken" },
               { status: 409 }
            );
         }
      }

      const { error } = await supabase
         .from("profiles")
         .update(profileUpdateData)
         .eq("id", user.id);

      if (error) {
         return NextResponse.json({ error: error.message }, { status: 400 });
      }
   }

   // Update favorite_genres in user_genre_preferences table
   if (favorite_genres && Array.isArray(favorite_genres)) {
      try {
         // 1. Delete existing preferences
         await supabase
            .from("user_genre_preferences")
            .delete()
            .eq("user_id", user.id);

         // 2. Clear existing embeddings and recommendations (Trigger for re-fold-in)
         await Promise.all([
            supabase.from("user_embeddings").delete().eq("user_id", user.id),
            supabase
               .from("movie_recommendations")
               .delete()
               .eq("user_id", user.id),
            supabase
               .from("show_recommendations")
               .delete()
               .eq("user_id", user.id),
         ]);

         // 3. Insert new preferences
         const genreIds = favorite_genres as number[];
         const genreRows = genreIds
            .map((id) => {
               const name = GENRE_MAP[id];
               if (!name) return null;
               return {
                  user_id: user.id,
                  genre: name,
                  updated_at: new Date().toISOString(),
               };
            })
            .filter(Boolean);

         if (genreRows.length > 0) {
            const { error: genreError } = await supabase
               .from("user_genre_preferences")
               .insert(genreRows as any);

            if (genreError) {
               console.error("Error updating genres:", genreError);
            }
         }
      } catch (err) {
         console.error("Error updating genre preferences:", err);
      }
   }

   // Fetch updated profile to return
   const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

   if (fetchError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
   }

   return NextResponse.json(profile);
}
