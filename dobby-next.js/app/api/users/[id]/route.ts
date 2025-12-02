import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  const supabase = await createClient();

  // Fetch specific user profile by ID
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, bio, created_at, theme')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
