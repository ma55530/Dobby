import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateUserEmbedding } from "@/lib/dobbySense";

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

  const showId = Number(id);
  if (!Number.isInteger(showId)) {
    return NextResponse.json({ error: "Invalid show id" }, { status: 400 });
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
    .eq("show_id", showId)
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
        show_id: showId,
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

  // Fire-and-forget vector update for recommendation engine
  updateUserEmbedding(supabase, user.id, showId, "show", rating).catch((err) =>
    console.error("Failed to update user embedding (show)", err)
  );

  return NextResponse.json({
    success: true,
    rating: ratingData,
  });
}
