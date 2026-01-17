/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { get_options } from '@/lib/TMDB_API/requestOptions'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const userId = params.id

  try {
    const { data: movieRatings, error: movieRatingsError } = await supabase
      .from('rating')
      .select('movie_id, rating, created_at')
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .not('movie_id', 'is', null)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4)

    if (movieRatingsError) {
      console.error('Movie ratings error:', movieRatingsError)
    }

    const { data: showRatings, error: showRatingsError } = await supabase
      .from('rating')
      .select('show_id, rating, created_at')
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .not('show_id', 'is', null)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4)

    if (showRatingsError) {
      console.error('Show ratings error:', showRatingsError)
    }

    const movieIds = movieRatings?.map(item => item.movie_id).filter(Boolean) || []

    const topMoviesPromise = Promise.all(
      movieIds.map(async (movieId, index) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}`, get_options)
          if (res.ok) {
            const movie = await res.json()
            return {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path || null,
              genres: movie.genres || [],
              rating: movieRatings?.[index]?.rating ?? null
            }
          }
        } catch (err) {
          console.error(`Error fetching movie ${movieId}:`, err)
        }
        return null
      })
    )

    const topShowsPromise = Promise.all(
      (showRatings || [])
        .filter(r => r.show_id)
        .map(async (row) => {
          const showId = row.show_id
          try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}`, get_options)
            if (res.ok) {
              const show = await res.json()
              return {
                id: show.id,
                name: show.name,
                poster_path: show.poster_path || null,
                genres: show.genres || [],
                rating: row.rating ?? null
              }
            }
          } catch (err) {
            console.error(`Error fetching show ${showId}:`, err)
          }
          return null
        })
    )

    const [fetchedMovies, fetchedShows] = await Promise.all([topMoviesPromise, topShowsPromise])

    const topMovies = fetchedMovies.filter(m => m !== null) as any[]
    const topShows = fetchedShows.filter(s => s !== null) as any[]

    return NextResponse.json({
      topMovies: topMovies.slice(0, 4),
      topShows: topShows.slice(0, 4)
    })
  } catch (error) {
    console.error('Profile stats error:', error)
    return NextResponse.json(
      {
        topMovies: [],
        topShows: []
      },
      { status: 200 }
    )
  }
}
