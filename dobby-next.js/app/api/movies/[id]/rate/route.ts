import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const movieId = Number(id);
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

  // Check if rating already exists
  const { data: existingRating } = await supabase
    .from("rating")
    .select("id")
    .eq("user_id", user.id)
    .eq("movie_id", movieId)
    .single();

  let ratingData;
  let ratingError;

  if (existingRating) {
    // Update existing rating
    const response = await supabase
      .from("rating")
      .update({
        rating,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRating.id)
      .select()
      .single();
    ratingData = response.data;
    ratingError = response.error;
  } else {
    // Insert new rating
    const response = await supabase
      .from("rating")
      .insert({
        user_id: user.id,
        movie_id: movieId,
        rating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    ratingData = response.data;
    ratingError = response.error;
  }

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    rating: ratingData,
  });
}
