import { StreamingSource } from '@/lib/types/StreamingSource';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tmdbId = (await params).id;
  const watchModeAPI_key = process.env.WATCHMODE_API;

  if (!watchModeAPI_key) {
    return NextResponse.json(
      { error: 'Watchmode API key is not configured.' },
      { status: 500 }
    );
  }

  try {
    // Step 1: Find the Watchmode ID using the TMDB ID
    const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${watchModeAPI_key}&search_field=tmdb_movie_id&search_value=${tmdbId}`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Watchmode Search API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to search for title on Watchmode.' },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.title_results;
    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json(
        { error: 'Movie not found on Watchmode.' },
        { status: 404 }
      );
    }

    const watchmodeId = searchResults[0].id;

    const sourcesUrl = `https://api.watchmode.com/v1/title/${watchmodeId}/sources/?apiKey=${watchModeAPI_key}`;
    const sourcesResponse = await fetch(sourcesUrl);

    if (!sourcesResponse.ok) {
      const errorData = await sourcesResponse.json();
      console.error('Watchmode Sources API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch streaming sources from Watchmode.' },
        { status: sourcesResponse.status }
      );
    }

    const sources: StreamingSource[] = await sourcesResponse.json();

    
    const rentSources = sources.filter((source: StreamingSource) => source.type === 'rent');

    return NextResponse.json(rentSources);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}