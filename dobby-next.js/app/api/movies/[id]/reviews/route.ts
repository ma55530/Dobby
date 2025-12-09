import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const movieId = (await params).id;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("movie_ratings")
    .select(
      `
      id,
      user_id,
      rating,
      review,
      created_at,
      profiles:user_id (
        username,
        avatar_url
      )
    `
    )
    .eq("movie_id", movieId)
    .not("review", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const movieId = (await params).id;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { rating, review } = body;

  if (!rating || !review) {
    return NextResponse.json(
      { error: "Rating and review text are required" },
      { status: 400 }
    );
  }

  if (rating < 1 || rating > 10) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 10" },
      { status: 400 }
    );
  }

  // Upsert movie rating with review
  const { data: ratingData, error: ratingError } = await supabase
    .from("movie_ratings")
    .upsert(
      {
        user_id: user.id,
        movie_id: parseInt(movieId),
        rating,
        review,
      },
      { onConflict: "user_id,movie_id" }
    )
    .select()
    .single();

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 400 });
  }

  return NextResponse.json(ratingData, { status: 201 });
}
