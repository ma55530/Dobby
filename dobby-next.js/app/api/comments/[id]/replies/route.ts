import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { comment_text } = body;

  if (!comment_text || comment_text.trim() === "") {
    return NextResponse.json(
      { error: "Comment text is required" },
      { status: 400 }
    );
  }

  // Get the parent comment to find the post_id
  const { data: parentComment, error: parentError } = await supabase
    .from("comments")
    .select("post_id")
    .eq("id", id)
    .single();

  if (parentError || !parentComment) {
    return NextResponse.json(
      { error: "Parent comment not found" },
      { status: 404 }
    );
  }

  // Insert reply with parent_comment set
  const { data: reply, error: replyError } = await supabase
    .from("comments")
    .insert({
      post_id: parentComment.post_id,
      user_id: user.id,
      comment_text: comment_text.trim(),
      parent_comment: id,
    })
    .select(
      `
      id,
      comment_text,
      created_at,
      reply_count,
      profiles:user_id(
        id,
        username,
        avatar_url
      )
    `
    )
    .single();

  if (replyError) {
    return NextResponse.json({ error: replyError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, reply });
}
