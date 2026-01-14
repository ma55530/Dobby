import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: parentId } = await params;

  try {
    // Fetch children from movie_ratings
    const { data: movieChildren, error: movieError } = await supabase
      .from("movie_ratings")
      .select(`
        id,
        user_id,
        movie_id,
        rating,
        review,
        created_at,
        first_parent,
        likes,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("first_parent", parentId)
      .order("created_at", { ascending: true });

    // Fetch children from show_ratings
    const { data: showChildren, error: showError } = await supabase
      .from("show_ratings")
      .select(`
        id,
        user_id,
        show_id,
        rating,
        review,
        created_at,
        first_parent,
        likes,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("first_parent", parentId)
      .order("created_at", { ascending: true });

    if (movieError) {
      console.error("Movie children fetch error:", movieError);
    }
    if (showError) {
      console.error("Show children fetch error:", showError);
    }

    // Combine all children
    const allChildren = [
      ...(movieChildren || []),
      ...(showChildren || [])
    ].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Determine which children themselves have replies
    const childIds = allChildren.map((c: any) => c.id);
    const { data: movieGrandChildren } = await supabase
      .from("movie_ratings")
      .select("id, first_parent")
      .in("first_parent", childIds);
    const { data: showGrandChildren } = await supabase
      .from("show_ratings")
      .select("id, first_parent")
      .in("first_parent", childIds);
    const hasRepliesSet = new Set(
      [...(movieGrandChildren || []), ...(showGrandChildren || [])].map((gc: any) => gc.first_parent)
    );

    // Transform to match frontend format
    const children = allChildren.map((child: any) => ({
      id: child.id,
      author: child.profiles?.username || "Anonymous",
      avatar: child.profiles?.avatar_url,
      rating: child.rating,
      content: child.review || "",
      date: new Date(child.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      likes: child.likes || 0,
      parentId: child.first_parent,
      hasChildren: hasRepliesSet.has(child.id),
    }));

    return NextResponse.json(children);
  } catch (error) {
    console.error("Error fetching children:", error);
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}
