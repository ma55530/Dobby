import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Shows } from '@/lib/types/Shows';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';

  // Za TV shows koristimo 'airing_today' endpoint jer TMDB nema direktni 'upcoming' endpoint za TV shows
  const url = `https://api.themoviedb.org/3/tv/on_the_air?page=${page}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `Failed to fetch upcoming shows from TMDB: ${errorData.status_message}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const shows: Shows[] = data.results;
    return NextResponse.json(shows);
    
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}