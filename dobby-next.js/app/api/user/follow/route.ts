import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

//User follows another user
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { target_user_id: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { target_user_id } = payload;

  if (!target_user_id) {
    return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
  }

  if (target_user_id === user.id) {
    return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
  }

  const { data: existingFollow, error: checkError } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', target_user_id)
    .maybeSingle();

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }

  if (existingFollow) {
    return NextResponse.json({ message: 'Already following' }, { status: 200 });
  }

  const { error: insertError } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: target_user_id });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Fetch and return the followed user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', target_user_id)
    .single();

  if (profileError) {
    // If we can't fetch the profile, just return success message
    return NextResponse.json({ message: 'Followed successfully' }, { status: 201 });
  }

  return NextResponse.json(profile);
}

//User unfollows another user
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { target_user_id: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { target_user_id } = payload;

  if (!target_user_id) {
    return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
  }

  // Delete follow
  const { error: deleteError } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', target_user_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Unfollowed successfully' }, { status: 200 });
}

//Check if the current user is following the target user
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const target_user_id = searchParams.get('target_user_id');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!target_user_id) {
        return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', target_user_id)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ isFollowing: !!data });
}
