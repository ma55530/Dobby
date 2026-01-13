import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const showId = (await params).id;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("show_ratings")
    .select(
      `
      id,
      user_id,
      rating,
      review_title,
      review,
      likes,
      dislikes,
      created_at,
      profiles:user_id (
        username,
        avatar_url
      )
    `
    )
    .eq("show_id", showId)
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
  const showId = (await params).id;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { rating, review_title, review } = body;

  if (!rating) {
    return NextResponse.json({ error: "Rating is required" }, { status: 400 });
  }

  if (rating < 1 || rating > 10) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 10" },
      { status: 400 }
    );
  }

  // Upsert show rating with optional review
  const { data: ratingData, error: ratingError } = await supabase
    .from("show_ratings")
    .upsert(
      {
        user_id: user.id,
        show_id: parseInt(showId),
        rating,
        review_title: review_title || null,
        review: review || null,
      },
      { onConflict: "user_id,show_id" }
    )
    .select()
    .single();

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 400 });
  }

  // --- Trigger Recommendation Update (Fire & Forget) ---
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3000";
  const fbsUrl = `${protocol}://${host}/api/recommendation-engine?limit=20`;
  
  // Asynchronously call engine to refresh recommendations
  fetch(fbsUrl, {
    headers: {
      cookie: request.headers.get("cookie") || ""
    }
  }).catch(err => console.error("Auto-rec update failed:", err));

  return NextResponse.json(ratingData, { status: 201 });
}
