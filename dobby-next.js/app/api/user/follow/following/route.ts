import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/UserProfile'

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user_id);

  if (followsError) {
    return NextResponse.json({ error: followsError.message }, { status: 500 });
  }

  if (!followsData || followsData.length === 0) {
    return NextResponse.json([] as UserProfile[]);
  }

  const followingIds = followsData.map(f => f.following_id);

  const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*').in('id', followingIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profiles = profilesData as UserProfile[];
  return NextResponse.json(profiles);
}
