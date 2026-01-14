import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { rating } = body;

  const movieId = Number(params.id);
  if (!Number.isInteger(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 });
  }

  // Validate rating
  if (!rating || rating < 1 || rating > 10) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 10" },
      { status: 400 }
    );
  }

  // Insert or update rating
  const { data: ratingData, error: ratingError } = await supabase
    .from("rating")
    .upsert(
      {
        user_id: user.id,
        movie_id: parseInt(params.id),
        rating: rating,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,movie_id",
      }
    )
    .select()
    .single();

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    rating: ratingData,
  });
}
