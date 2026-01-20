import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;

  try {
    const { data, error } = await supabase
      .from("post")
      .select("like_count, dislike_count")
      .eq("id", postId)
      .single();

    if (error) {
      console.error("Error fetching reaction counts:", error);
      return NextResponse.json({ likes: 0, dislikes: 0 }, { status: 200 });
    }

    return NextResponse.json({ 
      likes: data?.like_count ?? 0,
      dislikes: data?.dislike_count ?? 0
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ likes: 0, dislikes: 0 }, { status: 200 });
  }
}
