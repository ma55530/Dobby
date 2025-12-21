import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user.id;

    // Check if current user follows target user
    const { data: following, error: followingError } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", userId)
      .maybeSingle();

    if (followingError) {
      console.error("Error checking follow:", followingError);
      return NextResponse.json({ error: "Failed to check follow status" }, { status: 500 });
    }

    // Check if target user follows current user back
    const { data: followedBy, error: followedByError } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", userId)
      .eq("following_id", currentUserId)
      .maybeSingle();

    if (followedByError) {
      console.error("Error checking followed by:", followedByError);
    }

    if (following && followedBy) {
      return NextResponse.json({ status: "mutual" }); // Both follow each other
    } else if (following) {
      return NextResponse.json({ status: "following" }); // Current user follows target
    } else {
      return NextResponse.json({ status: "none" }); // Not following
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
