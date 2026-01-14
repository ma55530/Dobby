import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const showId = Number(params.id);
  if (!Number.isInteger(showId)) {
    return NextResponse.json({ error: "Invalid show id" }, { status: 400 });
  }

  const body = await req.json();
  const { rating, title, post_text } = body;

  if (rating === undefined || rating === null || rating < 1 || rating > 10) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 10" },
      { status: 400 }
    );
  }

  if (!title || !post_text) {
    return NextResponse.json(
      { error: "Both title and post_text are required" },
      { status: 400 }
    );
  }

  // Upsert rating (anchors the post id)
  const { data: ratingRow, error: ratingError } = await supabase
    .from("rating")
    .upsert(
      {
        user_id: user.id,
        show_id: showId,
        rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,show_id" }
    )
    .select()
    .single();

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 400 });
  }

  // Upsert post tied to rating id
  const { data: postData, error: postError } = await supabase
    .from("post")
    .upsert(
      {
        id: ratingRow.id,
        title,
        post_text,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    rating: ratingRow,
    post: postData,
  });
}
