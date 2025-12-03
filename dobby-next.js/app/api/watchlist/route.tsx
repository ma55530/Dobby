import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const watchlistName = searchParams.get('name'); // Optional: filter by watchlist name

    try {
        // Build query
        let query = supabase
            .from('watchlists')
            .select('*')
            .eq('user_id', user.id);

        // Filter by name if provided
        if (watchlistName) {
            query = query.eq('name', watchlistName);
        }

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