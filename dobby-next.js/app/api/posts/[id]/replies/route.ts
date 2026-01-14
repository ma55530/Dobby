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
  const {data, error} = await supabase
    .from("comments")
    .select("*")
    .eq("parent_comment", params.id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  const hasMore = data.length > limit;

  return NextResponse.json({
    comments: data.slice(0, limit),
    hasMore,
    nextOffset: offset + limit,
  });
}
