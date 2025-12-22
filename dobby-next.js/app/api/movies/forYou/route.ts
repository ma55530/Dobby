import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Movie } from '@/lib/types/Movie';
import { Movies } from '@/lib/types/Movies';

// --- Configuration for Movie Filtering ---
interface MovieFilterConfig {
    minVoteAverage: number;
    minReleaseYear: number;
    midTierVoteAverage: number;
    midTierReleaseYear: number;
}

// You can adjust these values to change the filtering conditions
const FILTER_CONFIG: MovieFilterConfig = {
    minVoteAverage: 5.1,      // Movies below this rating are considered "bad"
    minReleaseYear: 1991,     // Movies older than this are considered "bad"
    midTierVoteAverage: 7.4,  // Movies below this rating...
    midTierReleaseYear: 2008  // ...AND older than this are also considered "bad"
};

function isBadMovie(movie: Movie | Movies, config: MovieFilterConfig = FILTER_CONFIG): boolean {
    const yearStr = movie.release_date?.split('-')[0];
    const releaseYear = yearStr ? parseInt(yearStr) : 0;
    const safeYear = isNaN(releaseYear) ? 0 : releaseYear;
    
    return (movie.vote_average < config.minVoteAverage || safeYear < config.minReleaseYear || (movie.vote_average < config.midTierVoteAverage && safeYear <= config.midTierReleaseYear));
}
// -----------------------------------------

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
        
        // Fetch 3x the requested limit to ensure we have enough valid movies after filtering
        const fetchLimit = requestedLimit * 3;

        const { data, error } = await supabase.rpc('get_top_movies_for_user', { p_user_id: userId, p_limit: fetchLimit });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data) return NextResponse.json([], { status: 200 })

        const items = Array.isArray(data) ? data : [data]

        const ids = items.map((it: {movie_id: number}) => { return it.movie_id });
        
        const cookie = request.headers.get('cookie') ?? ''
        const fetchOptions = {
            headers: {
                cookie,
                accept: 'application/json',
            },
        }

        const fetches = ids.map((id) =>
            fetch(new URL(`/api/movies/${encodeURIComponent(String(id))}`, request.url).toString(), fetchOptions)
                .then(async (res) => {
                    if (!res.ok) {
                        const txt = await res.text().catch(() => '')
                        throw new Error(`/api/movies/${id} failed (${res.status}): ${txt}`)
                    }
                    return res.json()
                })
        )

            const settled = await Promise.allSettled(fetches)

        const movies = settled.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter((m): m is Movie => Boolean(m))



        const processedMovies = await Promise.all(movies.map(async (movie) => {
            if (isBadMovie(movie)) {
                const better = await findBetterSimilar(movie.id, request, fetchOptions);
                if (better) return better;
                return null;
            }
            return movie;
        }));

        // Filter out nulls and slice to the originally requested limit
        const finalMovies = processedMovies.filter((m): m is Movie => m !== null).slice(0, requestedLimit);

        return NextResponse.json(finalMovies, { status: 200 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
    }
}

async function findBetterSimilar(id: number, request: Request, fetchOptions: RequestInit): Promise<Movie | null> {
            try {
                const similarRes = await fetch(new URL(`/api/movies/${id}/similar`, request.url).toString(), fetchOptions);
                if (similarRes.ok) {
                    const similarMovies: Movies[] = await similarRes.json();
                    if (similarMovies.length > 0) {
                        // Filter out the original movie just in case
                        const candidates = similarMovies.filter(m => m.id !== id);
                        
                        if (candidates.length > 0) {
                            candidates.sort((a, b) => {
                                if (b.popularity !== a.popularity) return b.popularity - a.popularity;
                                const yearA = parseInt(a.release_date?.split('-')[0] || '0');
                                const yearB = parseInt(b.release_date?.split('-')[0] || '0');
                                return yearB - yearA;
                            });
                            
                            // Find the first candidate that is NOT a bad movie
                            const bestMatch = candidates.find(m => !isBadMovie(m));
                            
                            if (bestMatch) {
                                const detailRes = await fetch(new URL(`/api/movies/${bestMatch.id}`, request.url).toString(), fetchOptions);
                                if (detailRes.ok) {
                                    return await detailRes.json() as Movie;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error replacing movie:', e);
            }
            return null;
        }