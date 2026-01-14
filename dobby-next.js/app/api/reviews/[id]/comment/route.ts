import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: parentId } = await params;

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, movieId, movieType } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Determine which table to insert into based on movieType
    const table = movieType === "tv" ? "show_ratings" : "movie_ratings";
    const idField = movieType === "tv" ? "show_id" : "movie_id";

    // Insert the comment
    const { data, error } = await supabase
      .from(table)
      .insert({
        user_id: user.id,
        [idField]: parseInt(movieId),
        review: content,
        rating: null, // Comments don't have ratings
        first_parent: parentId, // parentId is already a UUID string
        likes: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: data });
  } catch (err) {
    console.error("Error creating comment:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
