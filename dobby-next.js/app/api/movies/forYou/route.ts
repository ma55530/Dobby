/* eslint-disable @typescript-eslint/no-explicit-any */import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Movie } from "@/lib/types/Movie";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData?.session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = sessionData.session.user.id;
    const url = new URL(request.url);
    const requestedLimit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);

    // 1. Get Recommended IDs
    const { data: recs } = await supabase
      .from("movie_recommendations")
      .select("movie_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(requestedLimit);

    if (!recs || recs.length === 0) return NextResponse.json([]);

    const tmdbIds = recs.map(r => r.movie_id);

    // 2. Check Local 'movies' Cache Table
    const { data: localData } = await supabase
      .from("movies")
      .select("*")
      .in("tmdb_id", tmdbIds);

    const localMap = new Map((localData || []).map(m => [m.tmdb_id, m]));
    const missingIds: number[] = [];

    // 3. Identify Missing
    tmdbIds.forEach(id => {
       if (!localMap.has(id)) {
           missingIds.push(id);
       }
    });

    // 4. Fetch Missing Parallel
    const missingMap = new Map<number, Movie>();
    if (missingIds.length > 0) {
        // Extract headers (including cookies) to pass to sub-request
        const headers = {
          cookie: request.headers.get("cookie") || "",
          accept: "application/json"
        };
        
        const fetched = await Promise.all(
            missingIds.map(async (id) => {
                try {
                    const res = await fetch(new URL(`/api/movies/${id}`, request.url).toString(), { headers });
                    return res.ok ? { id, data: await res.json() as Movie } : null;
                } catch { return null; }
            })
        );
        fetched.forEach(item => { 
            if(item) missingMap.set(item.id, item.data); 
        });
    }

    // 5. Construct Final List (Preserving Order)
    const finalOrdered = tmdbIds.map(id => {
        if (localMap.has(id)) {
            const dbMovie = localMap.get(id);
            // Transform DB shape to frontend Movie shape
            return {
                id: dbMovie.tmdb_id,
                title: dbMovie.title,
                poster_path: dbMovie.poster_url,
                release_date: dbMovie.release_date,
                vote_average: dbMovie.rating_average,
                // Add default/missing fields that frontend might need
                overview: null, // DB might not store overview
                backdrop_path: null,
                genres: (dbMovie.genre || []).map((name: string) => ({ id: 0, name })) 
            } as unknown as Movie;
        }
        if (missingMap.has(id)) return missingMap.get(id);
        return null;
    }).filter(Boolean);

    return NextResponse.json(finalOrdered);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
