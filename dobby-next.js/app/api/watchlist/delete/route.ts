import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const user = session?.user
  if (sessionError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { watchlistId } = body

    if (!watchlistId) {
      return NextResponse.json({ error: 'Watchlist ID is required' }, { status: 400 })
    }

    // Verify that the watchlist belongs to the current user
    const { data: watchlist } = await supabase
      .from('watchlists')
      .select('id, user_id')
      .eq('id', watchlistId)
      .single()

    if (!watchlist || watchlist.user_id !== user.id) {
      return NextResponse.json({ error: 'Watchlist not found or unauthorized' }, { status: 403 })
    }

    // Delete all items from this watchlist
    const { error: deleteItemsError } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', watchlistId)

    if (deleteItemsError) {
      console.error('Error deleting watchlist items:', deleteItemsError)
      return NextResponse.json({ error: 'Failed to delete watchlist items' }, { status: 400 })
    }

    // Delete the watchlist
    const { error: deleteError } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistId)

    if (deleteError) {
      console.error('Error deleting watchlist:', deleteError)
      return NextResponse.json({ error: 'Failed to delete watchlist' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to delete watchlist' },
      { status: 500 }
    )
  }
}
