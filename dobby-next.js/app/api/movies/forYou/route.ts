import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Movie } from '@/lib/types/Movie';

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

        const userId = sessionData?.session?.user?.id
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

        
        const url = new URL(request.url)
        const limitParam = url.searchParams.get('limit')
        const limit = limitParam ? parseInt(limitParam, 10) : 20

        if (limit > 100) {
            return NextResponse.json({ error: 'Limit too high' }, { status: 400 })
        }
        
        const { data, error } = await supabase.rpc('get_top_movies_for_user', { p_user_id: userId, p_limit: limit,});
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

        const movies: Movie[] = settled.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean)

        return NextResponse.json(movies, { status: 200 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
    }
}