import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get follow status between current user and target user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user.id;

    // Check if current user follows target user
    const { data: following } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", userId)
      .maybeSingle();

    // Check if target user follows current user back
    const { data: followsBack } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("following_id", currentUserId)
      .maybeSingle();

    return NextResponse.json({
      isFollowing: !!following,
      followsYouBack: !!followsBack,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
