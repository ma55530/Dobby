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

        const body = await request.json();
        const { movieId, showId } = body;

        if ((!movieId && !showId) || (movieId && showId)) {
            return NextResponse.json(
                { error: 'Provide either movieId or showId' },
                { status: 400 }
            );
        }

        // Get watchlist by name
        const { data: watchlist, error: watchlistError } = await supabase
            .from('watchlists')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', decodedName)
            .single();

        if (watchlistError || !watchlist) {
            return NextResponse.json(
                { error: 'Watchlist not found' },
                { status: 404 }
            );
        }

        // Check if already exists
        const { data: existingItem } = await supabase
            .from('watchlist_items')
            .select('id')
            .eq('watchlist_id', watchlist.id)
            .eq(movieId ? 'movie_id' : 'show_id', movieId || showId)
            .maybeSingle();

        if (existingItem) {
            return NextResponse.json(
                { error: 'Item already in watchlist' },
                { status: 409 }
            );
        }

        // Add item
        const { data, error } = await supabase
            .from('watchlist_items')
            .insert({
                watchlist_id: watchlist.id,
                movie_id: movieId || null,
                show_id: showId || null,
            })
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

        const { searchParams } = new URL(request.url);
        const movieId = searchParams.get('movieId');
        const showId = searchParams.get('showId');

        if ((!movieId && !showId) || (movieId && showId)) {
            return NextResponse.json(
                { error: 'Provide either movieId or showId' },
                { status: 400 }
            );
        }

        // Verify watchlist belongs to user
        const { data: watchlist } = await supabase
            .from('watchlists')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', decodedName)
            .single();

        if (!watchlist) {
            return NextResponse.json(
                { error: 'Watchlist not found' },
                { status: 404 }
            );
        }

        // Delete item
        const key = movieId ? 'movie_id' : 'show_id';
        const value = Number(movieId ?? showId);
        if (Number.isNaN(value)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const { data: deleted, error } = await supabase
            .from('watchlist_items')
            .delete()
            .eq('watchlist_id', watchlist.id)
            .eq(key, value)
            .select('id'); // returns deleted rows

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (!deleted || deleted.length === 0) {
            return NextResponse.json({ error: 'Item not found in watchlist' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Item removed' });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        return NextResponse.json(
            { error: 'Failed to remove item' },
            { status: 500 }
        );
    }
}