import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Collection } from '@/lib/types/Collection';
import { NextResponse } from 'next/server';


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const collectionId = (await params).id;
  const url = `https://api.themoviedb.org/3/collection/${collectionId}`;

  try {
    const response = await fetch(url, get_options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch collection details from TMDB: ${errorData.status_message}`,
        },
        { status: response.status }
      );
    }

    const collection: Collection = await response.json();
    
    return NextResponse.json(collection);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}