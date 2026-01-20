import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Fetch all posts with rating and user profile
  const { data: posts, error } = await supabase
    .from("post")
    .select(
      `
      id,
      title,
      post_text,
      comment_count,
      like_count,
      dislike_count,
      rating:rating!inner(
        rating,
        movie_id,
        show_id,
        created_at,
        updated_at,
        profiles:user_id(
          id,
          username,
          avatar_url
        )
      )
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ posts, count: posts?.length || 0 });
}

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

  // Get the post to verify ownership
  const { data: post, error: postError } = await supabase
    .from("post")
    .select("rating(user_id)")
    .eq("id", id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check if the user owns this post OR is an admin
  const postUserId = (post as any).rating?.user_id;
  if (postUserId !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete the post first
  const { error: deletePostError } = await supabase
    .from("post")
    .delete()
    .eq("id", id);

  if (deletePostError) {
    return NextResponse.json({ error: deletePostError.message }, { status: 500 });
  }

  // Delete the associated rating (post.id is the same as rating.id)
  const { error: deleteRatingError } = await supabase
    .from("rating")
    .delete()
    .eq("id", id);

  if (deleteRatingError) {
    return NextResponse.json({ error: deleteRatingError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
