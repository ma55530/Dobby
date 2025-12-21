import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('genre_layers')
      .select('name, genre_names, weight, bias, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'No genre layer found' }, { status: 404 })

    return NextResponse.json({ model: data })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'message' in err) {
      return NextResponse.json({ error: String((err as { message?: string }).message) }, { status: 500 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}