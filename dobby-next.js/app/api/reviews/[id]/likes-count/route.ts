import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reviewId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';
  const tableName = type === 'tv' ? 'show_ratings' : 'movie_ratings';

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("likes")
      .eq("id", reviewId)
      .single();

    if (error) {
      console.error("Error fetching likes count:", error);
      return NextResponse.json({ likes: 0 }, { status: 200 });
    }

    return NextResponse.json({ likes: data?.likes ?? 0 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ likes: 0 }, { status: 200 });
  }
}
