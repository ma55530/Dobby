import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ users: [] })
  }

  const supabase = await createClient()

  // Search by username, first_name, or last_name
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, bio, email')
    .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(20)

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ users: data || [] })
}
