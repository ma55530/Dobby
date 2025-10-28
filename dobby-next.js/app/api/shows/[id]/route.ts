import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Show } from '@/lib/types/Show';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{id: string}> }
) {
  const showId = (await params).id;
  const url = `https://api.themoviedb.org/3/tv/${showId}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch show details from TMDB: ${errorData.status_message}`,
        },
        { status: response.status }
      );
    }

    const show: Show = await response.json();
    
    return NextResponse.json(show);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

