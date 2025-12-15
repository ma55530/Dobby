import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch('https://api.themoviedb.org/3/genre/movie/list?language=en', {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch('https://api.themoviedb.org/3/genre/tv/list?language=en', {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }),
    ])

    if (!moviesRes.ok || !tvRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch genres' }, { status: 500 })
    }

    const moviesData = await moviesRes.json()
    const tvData = await tvRes.json()

    // Combine and deduplicate genres by id
    const allGenres = [...moviesData.genres, ...tvData.genres]
    const uniqueGenres = Array.from(
      new Map(allGenres.map((genre: { id: number; name: string }) => [genre.id, genre])).values()
    )

    return NextResponse.json({ genres: uniqueGenres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
