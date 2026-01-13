import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { get_options } from '@/lib/TMDB_API/requestOptions'

// TMDB Genre IDs to names mapping
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
}

export async function GET(request: Request) {
  const supabase = await createClient()

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const user = session?.user
  if (sessionError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try to get favorite genres from request query params (sent from frontend with localStorage data)
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get('favorite_genres');
    let favoriteGenresFromClient: string[] = [];
    
    if (genresParam) {
      try {
        const genreIds = JSON.parse(genresParam);
        if (Array.isArray(genreIds)) {
          favoriteGenresFromClient = genreIds
            .map((id: number) => GENRE_MAP[id])
            .filter(Boolean);
        }
      } catch (e) {
        console.error('Failed to parse favorite_genres param:', e);
      }
    }
    
    // Fetch all watchlists for this user
    const { data: watchlists, error: watchlistsError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('user_id', user.id)

    if (watchlistsError || !watchlists || watchlists.length === 0) {
      // Return favorite genres from client even if no watchlists
      return NextResponse.json({
        favoriteGenres: favoriteGenresFromClient,
        topMovies: [],
        topShows: []
      })
    }

    const watchlistIds = watchlists.map(w => w.id)

    // Fetch watchlist items for all watchlists
    const { data: watchlistItems, error: watchlistError } = await supabase
      .from('watchlist_items')
      .select('movie_id, show_id')
      .in('watchlist_id', watchlistIds)

    if (watchlistError) {
      console.error('Watchlist error:', watchlistError)
      // Return empty stats if error
      return NextResponse.json({
        favoriteGenres: [],
        topMovies: [],
        topShows: []
      })
    }

    const movieIds = watchlistItems
      ?.filter(item => item.movie_id)
      .map(item => item.movie_id)
      .slice(0, 10) || []

    const showIds = watchlistItems
      ?.filter(item => item.show_id)
      .map(item => item.show_id)
      .slice(0, 10) || []

    // Fetch movie details from TMDB
    const topMovies = []
    for (const movieId of movieIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}`,
          get_options
        )
        if (res.ok) {
          const movie = await res.json()
          topMovies.push({
            id: movie.id,
            title: movie.title,
            genres: movie.genres || []
          })
        }
      } catch (err) {
        console.error(`Error fetching movie ${movieId}:`, err)
      }
    }

    // Fetch show details from TMDB
    const topShows = []
    for (const showId of showIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${showId}`,
          get_options
        )
        if (res.ok) {
          const show = await res.json()
          topShows.push({
            id: show.id,
            name: show.name,
            genres: show.genres || []
          })
        }
      } catch (err) {
        console.error(`Error fetching show ${showId}:`, err)
      }
    }

    // Calculate favorite genres from all watched content (if not provided by client)
    let favoriteGenres = favoriteGenresFromClient;
    
    if (favoriteGenres.length === 0) {
      const genreCount: Record<string, number> = {}
      
      ;[...topMovies, ...topShows].forEach(item => {
        const genres = item.genres as Array<{ id: number; name: string }>
        genres.forEach(genre => {
          const genreName = genre.name || GENRE_MAP[genre.id] || 'Unknown'
          genreCount[genreName] = (genreCount[genreName] || 0) + 1
        })
      })

      // Get top 5 genres from watchlist as fallback
      favoriteGenres = Object.entries(genreCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre]) => genre)
    }

    return NextResponse.json({
      favoriteGenres,
      topMovies: topMovies.slice(0, 4),
      topShows: topShows.slice(0, 4)
    })
  } catch (error) {
    console.error('Profile stats error:', error)
    return NextResponse.json(
      {
        favoriteGenres: [],
        topMovies: [],
        topShows: []
      },
      { status: 200 } // Return empty stats instead of error
    )
  }
}
