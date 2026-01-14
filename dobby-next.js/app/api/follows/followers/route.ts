import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get all users who follow you (your followers)
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all followers (users who follow me)
    const { data, error } = await supabase
      .from("follows")
      .select(`
        follower_id,
        followed_at,
        follower:profiles!follows_follower_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("following_id", user.id)
      .order("followed_at", { ascending: false });

    if (error) {
      console.error("Error fetching followers:", error);
      return NextResponse.json({ error: "Failed to fetch followers" }, { status: 500 });
    }

    return NextResponse.json({ followers: data || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
