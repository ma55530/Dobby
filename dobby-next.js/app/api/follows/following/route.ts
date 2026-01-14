import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get all users you are following
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users I'm following
    const { data, error } = await supabase
      .from("follows")
      .select(`
        following_id,
        followed_at,
        following:profiles!follows_following_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("follower_id", user.id)
      .order("followed_at", { ascending: false });

    if (error) {
      console.error("Error fetching following:", error);
      return NextResponse.json({ error: "Failed to fetch following" }, { status: 500 });
    }

    return NextResponse.json({ following: data || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
