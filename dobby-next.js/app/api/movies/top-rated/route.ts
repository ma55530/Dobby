import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Movies } from '@/lib/types/Movies';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';

  const url = `https://api.themoviedb.org/3/movie/top_rated?page=${page}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `Failed to fetch top rated movies from TMDB: ${errorData.status_message}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const movies: Movies[] = data.results;
    return NextResponse.json(movies);
    
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}