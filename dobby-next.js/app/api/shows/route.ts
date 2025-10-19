import { NextResponse } from 'next/server';
import { Show } from '@/lib/types/Show';
import { get_options } from '@/lib/TMDB_API/requestOptions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';

    // Validate query parameter
    if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

    const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&page=${page}`;

    // Fetch shows from TMDB API
    try {
    const response = await fetch(url, get_options);

    // Handle TMDB API errors
    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch shows from TMDB: ${errorData.status_message}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const shows: Show[] = data.results;
    return NextResponse.json(shows);
    } catch (error) {
    console.error('Error fetching shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shows' },
      { status: 500 }
    );
  }
}