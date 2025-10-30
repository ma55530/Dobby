import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";
import { Show } from "@/lib/types/Show";

export async function GET() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getSession();
  if (userError || !userData?.session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.session.user.id;

  const { data, error } = await supabase.from("show_recommendations").select("show_id").eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const showIds = data.map((item: { show_id: number }) => item.show_id);

  const shows: Show[] = await Promise.all(
    showIds.map(async (id: number) => {
      const url = `https://api.themoviedb.org/3/tv/${id}`;
      const res = await fetch(url, get_options);
      if (!res.ok) return null;
      return await res.json();
    })
  );


  return NextResponse.json(shows);
}