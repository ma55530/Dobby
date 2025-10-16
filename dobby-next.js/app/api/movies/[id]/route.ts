import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Movie } from '@/lib/types/Movie';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{id: string}> }
) {
  const movieId = (await params).id;
  const url = `https://api.themoviedb.org/3/movie/${movieId}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch movie details from TMDB: ${errorData.status_message}`,
        },
        { status: response.status }
      );
    }

    const movie: Movie = await response.json();
    
    return NextResponse.json(movie);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
