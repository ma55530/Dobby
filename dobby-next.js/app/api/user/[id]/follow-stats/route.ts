import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Get follower and following counts for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Count followers (users following this user)
  const { count: followersCount, error: followersError } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', id);

  if (followersError) {
    return NextResponse.json({ error: followersError.message }, { status: 500 });
  }

  // Count following (users this user is following)
  const { count: followingCount, error: followingError } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', id);

  if (followingError) {
    return NextResponse.json({ error: followingError.message }, { status: 500 });
  }

  return NextResponse.json({
    followersCount: followersCount || 0,
    followingCount: followingCount || 0,
  });
}
