import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
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
  const { post_id, comment_text } = body;

  if (!post_id) {
    return NextResponse.json({ error: "post_id is required" }, { status: 400 });
  }

  if (!comment_text || comment_text.trim() === "") {
    return NextResponse.json(
      { error: "Comment text is required" },
      { status: 400 }
    );
  }

  // Insert top-level comment
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      post_id,
      user_id: user.id,
      comment_text: comment_text.trim(),
      parent_comment: null,
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

  if (commentError) {
    return NextResponse.json({ error: commentError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, comment });
}
