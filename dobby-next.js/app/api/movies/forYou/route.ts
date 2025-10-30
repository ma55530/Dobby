import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";
import { Movie } from "@/data/mockData";

export async function GET() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getSession();  
  
  if (userError || !userData?.session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = userData.session?.user.id;

  const { data, error } = await supabase.from("movie_recommendations").select("movie_id").eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const movieIds = data.map((item: { movie_id: number }) => item.movie_id);

  const moviesForYou: Movie[] = await Promise.all(
    movieIds.map(async (id: number) => {
      const url = `https://api.themoviedb.org/3/movie/${id}`;
      const res = await fetch(url, get_options);
      if (!res.ok) return null;
      return await res.json();
    })
  );


  return NextResponse.json(moviesForYou);
}