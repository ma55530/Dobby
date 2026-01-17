import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ liked: false });
    }

    const { data: reaction } = await supabase
      .from("reaction")
      .select("type")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ liked: reaction?.type === 'like' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ liked: false });
  }
}
