import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already reacted to this post
    const { data: existingReaction } = await supabase
      .from("reaction")
      .select("type")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReaction) {
      if (existingReaction.type === 'dislike') {
        // User already disliked, so remove the dislike
        await supabase
          .from("reaction")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        // Get updated counts from post
        const { data: postData } = await supabase
          .from("post")
          .select("like_count, dislike_count")
          .eq("id", postId)
          .single();

        return NextResponse.json({ 
          disliked: false, 
          dislikes: postData?.dislike_count ?? 0,
          liked: false,
          likes: postData?.like_count ?? 0
        });
      } else {
        // User had liked, change to dislike
        await supabase
          .from("reaction")
          .update({ type: 'dislike' })
          .eq("post_id", postId)
          .eq("user_id", user.id);

        // Get updated counts from post
        const { data: postData } = await supabase
          .from("post")
          .select("like_count, dislike_count")
          .eq("id", postId)
          .single();

        return NextResponse.json({ 
          disliked: true, 
          dislikes: postData?.dislike_count ?? 0,
          liked: false,
          likes: postData?.like_count ?? 0
        });
      }
    } else {
      // User hasn't reacted, so add dislike
      await supabase
        .from("reaction")
        .insert({
          post_id: postId,
          user_id: user.id,
          type: 'dislike',
        });

      // Get updated counts from post
      const { data: postData } = await supabase
        .from("post")
        .select("like_count, dislike_count")
        .eq("id", postId)
        .single();

      return NextResponse.json({ 
        disliked: true, 
        dislikes: postData?.dislike_count ?? 0,
        liked: false,
        likes: postData?.like_count ?? 0
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
