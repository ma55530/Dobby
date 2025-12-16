import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reject friend request
export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this user is the recipient
    const { data: friendship, error: fetchError } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", params.requestId)
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", params.requestId);

    if (deleteError) {
      console.error("Error rejecting request:", deleteError);
      return NextResponse.json({ error: "Failed to reject request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
