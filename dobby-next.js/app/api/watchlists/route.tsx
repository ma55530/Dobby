import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Build query
        const query = supabase
            .from('watchlists')
            .select(`
            id,
            name,
            visibility,
            created_at,
            watchlist_items (
            id,
            movie_id,
            show_id,
            added_at
            )
        `).eq('user_id', user.id);

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching watchlists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch watchlists' },
            { status: 500 }
        );
    }
}