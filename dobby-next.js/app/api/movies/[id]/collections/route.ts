export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: movieId } = await params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`
    );

    if (!response.ok) {
      return Response.json({ collection: null }, { status: 200 });
    }

    const movieData = await response.json();
    const belongsToCollection = movieData.belongs_to_collection;

    if (!belongsToCollection) {
      return Response.json({ collection: null }, { status: 200 });
    }

    // Fetch collection details including parts
    const collectionResponse = await fetch(
      `https://api.themoviedb.org/3/collection/${belongsToCollection.id}?api_key=${apiKey}&language=en-US`
    );

    if (!collectionResponse.ok) {
      return Response.json({ collection: belongsToCollection }, { status: 200 });
    }

    const collectionData = await collectionResponse.json();

    return Response.json({
      collection: {
        id: collectionData.id,
        name: collectionData.name,
        overview: collectionData.overview,
        poster_path: collectionData.poster_path,
        backdrop_path: collectionData.backdrop_path,
        parts: collectionData.parts || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch collection:', error);
    return Response.json({ collection: null }, { status: 200 });
  }
}
