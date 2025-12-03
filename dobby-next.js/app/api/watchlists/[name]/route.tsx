import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name } = await params;
        const decodedName = decodeURIComponent(name);

        // Check if already exists
        const { data: existingItem } = await supabase
            .from('watchlists')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', decodedName)
            .single();

        if (existingItem) {
            return NextResponse.json(
                { error: 'Watchlist with this name already exists' },
                { status: 409 }
            );
        }

        // Add item
        const { data, error } = await supabase
            .from('watchlists')
            .insert({ user_id: user.id, name: decodedName, visibility: 'public' })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        return NextResponse.json(
            { error: 'Failed to add to watchlist' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name } = await params;
        const decodedName = decodeURIComponent(name);

        // Delete the entire watchlist (items will cascade delete if set up in DB)
        const { data: deleted, error } = await supabase
            .from('watchlists')
            .delete()
            .eq('user_id', user.id)
            .eq('name', decodedName)
            .select('id'); // force returning deleted rows

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (!deleted || deleted.length === 0) {
            return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Watchlist deleted' });
    } catch (error) {
        console.error('Error deleting watchlist:', error);
        return NextResponse.json({ error: 'Failed to delete watchlist' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name } = await params;
        const decodedName = decodeURIComponent(name);

        // Get watchlist with items
        const { data: watchlist, error } = await supabase
            .from('watchlists')
            .select(`
                id,
                name,
                watchlist_items (
                    id,
                    movie_id,
                    show_id,
                    added_at
                )
            `)
            .eq('user_id', user.id)
            .eq('name', decodedName)
            .single();

        if (error || !watchlist) {
            return NextResponse.json(
                { error: 'Watchlist not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(watchlist);
    } catch (error) {
        console.error('Error fetching watchlist items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}