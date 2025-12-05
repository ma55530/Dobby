import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Show } from '@/lib/types/Show';
import { Shows } from '@/lib/types/Shows';

// --- Configuration for Show Filtering ---
interface ShowFilterConfig {
    minVoteAverage: number;
    minFirstAirYear: number;
    midTierVoteAverage: number;
    midTierFirstAirYear: number;
}

const FILTER_CONFIG: ShowFilterConfig = {
    minVoteAverage: 5.1,
    minFirstAirYear: 1991,
    midTierVoteAverage: 7.4,
    midTierFirstAirYear: 2008
};

function isBadShow(show: Show | Shows, config: ShowFilterConfig = FILTER_CONFIG): boolean {
    const yearStr = show.first_air_date?.split('-')[0];
    const firstAirYear = yearStr ? parseInt(yearStr) : 0;
    const safeYear = isNaN(firstAirYear) ? 0 : firstAirYear;
    
    return (show.vote_average < config.minVoteAverage || safeYear < config.minFirstAirYear || (show.vote_average < config.midTierVoteAverage && safeYear <= config.midTierFirstAirYear));
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

        const userId = sessionData?.session?.user?.id
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

        
        const url = new URL(request.url)
        const limitParam = url.searchParams.get('limit')
        const requestedLimit = limitParam ? parseInt(limitParam, 10) : 20;

        if (requestedLimit > 100) {
            return NextResponse.json({ error: 'Limit too high' }, { status: 400 })
        }

        // Fetch 3x the requested limit to ensure we have enough valid shows after filtering
        const fetchLimit = requestedLimit * 3;
        
        const { data, error } = await supabase.rpc('get_top_shows_for_user', { p_user_id: userId, p_limit: fetchLimit, });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data) return NextResponse.json([], { status: 200 })

        const items = Array.isArray(data) ? data : [data]

         const ids = items.map((it: {show_id: number}) => { return it.show_id });

        
        const cookie = request.headers.get('cookie') ?? ''
        const fetchOptions = {
            headers: {
                cookie,
                accept: 'application/json',
            },
        }

        const fetches = ids.map((id) =>
            fetch(new URL(`/api/shows/${encodeURIComponent(String(id))}`, request.url).toString(), fetchOptions)
                .then(async (res) => {
                    if (!res.ok) {
                        const txt = await res.text().catch(() => '')
                        throw new Error(`/api/shows/${id} failed (${res.status}): ${txt}`)
                    }
                    return res.json()
                })
        )

        const settled = await Promise.allSettled(fetches)

        
        const shows = settled
            .map((r) => (r.status === 'fulfilled' ? r.value : null))
            .filter((s): s is Show => Boolean(s))

        const processedShows = await Promise.all(shows.map(async (show) => {
            if (isBadShow(show)) {
                const better = await findBetterSimilar(show.id, request, fetchOptions);
                if (better) return better;
                return null;
            }
            return show;
        }));

        // Filter out nulls and slice to the originally requested limit
        const finalShows = processedShows.filter((s): s is Show => s !== null).slice(0, requestedLimit);

        return NextResponse.json(finalShows, { status: 200 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
    }
}

async function findBetterSimilar(id: number, request: Request, fetchOptions: RequestInit): Promise<Show | null> {
    try {
        const similarRes = await fetch(new URL(`/api/shows/${id}/similar`, request.url).toString(), fetchOptions);
        if (similarRes.ok) {
            const similarShows: Shows[] = await similarRes.json();
            if (similarShows.length > 0) {
                const candidates = similarShows.filter(s => s.id !== id);
                
                if (candidates.length > 0) {
                    candidates.sort((a, b) => {
                        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
                        const yearA = parseInt(a.first_air_date?.split('-')[0] || '0');
                        const yearB = parseInt(b.first_air_date?.split('-')[0] || '0');
                        return yearB - yearA;
                    });
                    
                    const bestMatch = candidates.find(s => !isBadShow(s));
                    
                    if (bestMatch) {
                        const detailRes = await fetch(new URL(`/api/shows/${bestMatch.id}`, request.url).toString(), fetchOptions);
                        if (detailRes.ok) {
                            return await detailRes.json() as Show;
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error replacing show:', e);
    }
    return null;
}