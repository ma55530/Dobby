/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { get_options } from '@/lib/TMDB_API/requestOptions';

export async function GET() {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch watchlists and items
        const { data: watchlists, error: watchlistsError } = await supabase
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
        `)
            .eq('user_id', user.id);

        if (watchlistsError) {
            return NextResponse.json({ error: watchlistsError.message }, { status: 400 });
        }

        if (!watchlists || watchlists.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch details from TMDB for each item
        const populatedWatchlists = await Promise.all(
            watchlists.map(async (list: any) => {
                const items = list.watchlist_items || [];
                const itemsWithDetails = await Promise.all(
                    items.map(async (item: any) => {
                        try {
                            if (item.movie_id) {
                                const res = await fetch(
                                    `https://api.themoviedb.org/3/movie/${item.movie_id}`,
                                    get_options
                                );
                                if (res.ok) {
                                    const movie = await res.json();
                                    return {
                                        ...item,
                                        movies: {
                                            title: movie.title,
                                            poster_path: movie.poster_path
                                        }
                                    };
                                }
                            } else if (item.show_id) {
                                const res = await fetch(
                                    `https://api.themoviedb.org/3/tv/${item.show_id}`,
                                    get_options
                                );
                                if (res.ok) {
                                    const show = await res.json();
                                    return {
                                        ...item,
                                        shows: {
                                            name: show.name,
                                            poster_path: show.poster_path
                                        }
                                    };
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching item details:', err);
                        }
                        return item;
                    })
                );

                return {
                    ...list,
                    watchlist_items: itemsWithDetails
                };
            })
        );

        return NextResponse.json(populatedWatchlists);
    } catch (error) {
        console.error('Error fetching watchlists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch watchlists' },
            { status: 500 }
        );
    }
}