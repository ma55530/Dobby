import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// app/api/posts/[id]/comments/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "5");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Fetch limit + 1 to know if there are more
  const supabase = await createClient();
  const comments = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", params.id)
    .is("parent_comment", null) // Only top-level comments
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (comments.error) {
    return NextResponse.json(
      { error: comments.error.message },
      { status: 400 }
    );
  }

  const hasMore = comments.data.length > limit;

  return NextResponse.json({
    comments: comments.data.slice(0, limit),
    hasMore,
    nextOffset: offset + limit,
  });
}
