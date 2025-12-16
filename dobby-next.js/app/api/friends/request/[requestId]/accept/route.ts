import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Accept friend request
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

    // Update status to accepted
    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", params.requestId);

    if (updateError) {
      console.error("Error accepting request:", updateError);
      return NextResponse.json({ error: "Failed to accept request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
