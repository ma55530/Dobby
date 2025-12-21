import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Unfriend / remove friendship
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = userId;

    // Delete the friendship
    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${user.id})`);

    if (error) {
      console.error("Error removing friendship:", error);
      return NextResponse.json({ error: "Failed to remove friendship" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
