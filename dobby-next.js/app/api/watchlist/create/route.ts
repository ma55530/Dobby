import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
   const supabase = await createClient();

   // Get session
   const {
      data: { user },
      error: sessionError,
   } = await supabase.auth.getUser();
   if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { name } = body;

      if (!name || !name.trim()) {
         return NextResponse.json(
            { error: "Watchlist name is required" },
            { status: 400 }
         );
      }

      // Check if watchlist with this name already exists for this user
      const { data: existingWatchlist } = await supabase
         .from("watchlists")
         .select("id")
         .eq("user_id", user.id)
         .eq("name", name.trim())
         .maybeSingle();

      if (existingWatchlist) {
         return NextResponse.json(
            { error: "Watchlist with this name already exists" },
            { status: 409 }
         );
      }

      // Create new watchlist
      const { data: newWatchlist, error: createError } = await supabase
         .from("watchlists")
         .insert({ user_id: user.id, name: name.trim() })
         .select("id, name")
         .single();

      if (createError) {
         console.error("Error creating watchlist:", createError);
         return NextResponse.json(
            { error: "Failed to create watchlist" },
            { status: 400 }
         );
      }

      return NextResponse.json({ watchlist: newWatchlist });
   } catch (error) {
      console.error("Create watchlist error:", error);
      return NextResponse.json(
         { error: "Failed to create watchlist" },
         { status: 500 }
      );
   }
}
