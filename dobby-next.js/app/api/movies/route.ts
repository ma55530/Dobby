import { NextResponse } from 'next/server';
import { Movies } from '@/lib/types/Movies';
import { get_options } from '@/lib/TMDB_API/requestOptions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&page=${page}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch movies from TMDB: ${errorData.status_message}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const movies: Movies[] = data.results;
    return NextResponse.json({
      results: movies,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });

  } catch (error) {
    console.error('Internal Server Error:', error);
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}