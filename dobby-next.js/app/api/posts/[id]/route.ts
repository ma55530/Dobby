import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Fetch all posts with rating and user profile
  const { data: posts, error } = await supabase
    .from("post")
    .select(
      `
      id,
      title,
      post_text,
      comment_count,
      like_count,
      dislike_count,
      rating:rating!inner(
        rating,
        movie_id,
        show_id,
        created_at,
        updated_at,
        profiles:user_id(
          id,
          username,
          avatar_url
        )
      )
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ posts, count: posts?.length || 0 });
}
