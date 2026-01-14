import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reviewId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';
  const tableName = type === 'tv' ? 'show_ratings' : 'movie_ratings';

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already liked this review
    const { data: existingLike } = await supabase
      .from("review_likes")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingLike) {
      // User already liked, so unlike
      await supabase
        .from("review_likes")
        .delete()
        .eq("id", existingLike.id);

      // Decrement likes count
      const { data: currentData } = await supabase
        .from(tableName)
        .select("likes")
        .eq("id", reviewId)
        .single();

      const newLikes = Math.max(0, (currentData?.likes ?? 0) - 1);

      await supabase
        .from(tableName)
        .update({ likes: newLikes })
        .eq("id", reviewId);

      return NextResponse.json({ liked: false, likes: newLikes });
    } else {
      // User hasn't liked, so like
      await supabase
        .from("review_likes")
        .insert({
          review_id: reviewId,
          user_id: user.id,
        });

      // Increment likes count
      const { data: currentData } = await supabase
        .from(tableName)
        .select("likes")
        .eq("id", reviewId)
        .single();

      const newLikes = (currentData?.likes ?? 0) + 1;

      await supabase
        .from(tableName)
        .update({ likes: newLikes })
        .eq("id", reviewId);

      return NextResponse.json({ liked: true, likes: newLikes });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reviewId } = await params;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ liked: false });
    }

    const { data: existingLike } = await supabase
      .from("review_likes")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ liked: !!existingLike });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ liked: false });
  }
}