/* eslint-disable @typescript-eslint/no-explicit-any */ import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Movie } from "@/lib/types/Movie";

// Global cache that persists across requests - per user
const userMovieCaches: Record<string, Record<number, Movie>> = {};

export async function GET(request: Request) {
   try {
      const supabase = await createClient();
      const {
         data: { user },
         error: sessionError,
      } = await supabase.auth.getUser();

      if (sessionError || !user?.id) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const userId = user.id;
      const url = new URL(request.url);
      const requestedLimit = Math.min(
         parseInt(url.searchParams.get("limit") || "20", 10),
         100
      );

      // 1. Get Recommended IDs
      const { data: recs } = await supabase
         .from("movie_recommendations")
         .select("movie_id, created_at")
         .eq("user_id", userId)
         .order("created_at", { ascending: false })
         .limit(requestedLimit);

      if (!recs || recs.length === 0) return NextResponse.json([]);

      const movieIds = recs.map((r) => r.movie_id);

      // Keep order based on recommendation creation time

      // Initialize user cache if not exists
      if (!userMovieCaches[userId]) {
         userMovieCaches[userId] = {};
      }
      const userCache = userMovieCaches[userId];

      // Check which movies are missing from cache
      const missingIds = movieIds.filter((id) => !userCache[id]);

      // Fetch missing movies from TMDB API
      if (missingIds.length > 0) {
         const headers = {
            cookie: request.headers.get("cookie") || "",
            accept: "application/json",
         };

         const fetchedMovies = await Promise.all(
            missingIds.map(async (id) => {
               try {
                  const res = await fetch(
                     new URL(`/api/movies/${id}`, request.url).toString(),
                     { headers }
                  );
                  if (res.ok) {
                     const movie = (await res.json()) as Movie;
                     return { id, movie };
                  }
               } catch (err) {
                  console.error(`Failed to fetch movie ${id}:`, err);
               }
               return null;
            })
         );

         // Store fetched movies in cache
         fetchedMovies.forEach((item) => {
            if (item) {
               userCache[item.id] = item.movie;
            }
         });
      }

      // Return movies in order from cache
      const orderedMovies = movieIds
         .map((id) => userCache[id])
         .filter((m): m is Movie => Boolean(m));

      return NextResponse.json(orderedMovies);
   } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
   }
}
