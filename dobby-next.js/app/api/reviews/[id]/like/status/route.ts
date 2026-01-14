import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
