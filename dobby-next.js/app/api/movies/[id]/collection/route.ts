import { get_options } from '@/lib/TMDB_API/requestOptions';
import { Collection } from '@/lib/types/Collection';
import { Movie } from '@/lib/types/Movie';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const movieId = (await params).id;
  
  const url = `https://api.themoviedb.org/3/movie/${movieId}`;

  try {
    const movieResponse = await fetch(url, get_options);

    if (!movieResponse.ok) {
      const errorData = await movieResponse.json();
      console.error('TMDB API Error (fetching movie):', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch movie details for ID ${movieId}: ${errorData.status_message}`,
        },
        { status: movieResponse.status }
      );
    }

    const movie: Movie = await movieResponse.json();

    if (!movie.belongs_to_collection) {
      return NextResponse.json(
        { message: `Movie with ID ${movieId} does not belong to a collection.` },
        { status: 404 }
      );
    }

    const collectionId = movie.belongs_to_collection.id;
    const collectionUrl = `https://api.themoviedb.org/3/collection/${collectionId}`;

    const collectionResponse = await fetch(collectionUrl, get_options);

    if (!collectionResponse.ok) {
      const errorData = await collectionResponse.json();
      console.error('TMDB API Error (fetching collection):', errorData);
      return NextResponse.json(
        {
          error: `Failed to fetch collection details from TMDB: ${errorData.status_message}`,
        },
        { status: collectionResponse.status }
      );
    }

    const collection: Collection = await collectionResponse.json();
    
    return NextResponse.json(collection);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}