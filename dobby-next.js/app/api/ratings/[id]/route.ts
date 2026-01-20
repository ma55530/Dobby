import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get the current user's profile to check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.isAdmin || false;

  // Get the rating to verify ownership
  const { data: rating, error: ratingError } = await supabase
    .from("rating")
    .select("user_id")
    .eq("id", id)
    .single();

  if (ratingError || !rating) {
    return NextResponse.json({ error: "Rating not found" }, { status: 404 });
  }

  // Check if the user owns this rating OR is an admin
  if (rating.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete the rating
  const { error: deleteError } = await supabase
    .from("rating")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
