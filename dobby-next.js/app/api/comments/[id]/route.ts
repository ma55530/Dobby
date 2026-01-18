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

  // Get the comment to verify ownership
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single();

  if (commentError || !comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Check if the user owns this comment OR is an admin
  if (comment.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete the comment (cascade should handle replies)
  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
