import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Send friend request
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientId } = await request.json();

    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID required" }, { status: 400 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Friendship already exists" }, { status: 400 });
    }

    // Create friend request
    const { data, error } = await supabase
      .from("friendships")
      .insert({
        requester_id: user.id,
        recipient_id: recipientId,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating friendship:", error);
      return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
