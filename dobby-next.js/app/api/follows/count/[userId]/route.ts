import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get follower and following counts for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    // Count followers (people who follow this user)
    const { count: followersCount, error: followersError } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    // Count following (people this user follows)
    const { count: followingCount, error: followingError } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    if (followersError || followingError) {
      console.error("Error fetching counts:", followersError || followingError);
      return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
    }

    return NextResponse.json({
      followers: followersCount || 0,
      following: followingCount || 0,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
