import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Movie } from '@/lib/types/Movie';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeWindow = searchParams.get('time_window') || 'day'; 
  const page = searchParams.get('page') || '1';

  if (timeWindow !== 'day' && timeWindow !== 'week') {
    return NextResponse.json(
      { error: 'Invalid time_window parameter. Use "day" or "week".' },
      { status: 400 }
    );
  }

  const url = `https://api.themoviedb.org/3/trending/movie/${timeWindow}?page=${page}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      return NextResponse.json(
        { error: `Failed to fetch trending movies from TMDB: ${errorData.status_message}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const trendingMovies: Movie[] = data.results;
    return NextResponse.json(trendingMovies);
    
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
