import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Shows } from '@/lib/types/Shows';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const showId = (await params).id;
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';

  const url = `https://api.themoviedb.org/3/tv/${showId}/recommendations?page=${page}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `Failed to fetch show recommendations from TMDB: ${errorData.status_message}` },
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
