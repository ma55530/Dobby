export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return Response.json({ collection: null }, { status: 200 });
    }

    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${showId}?api_key=${apiKey}&language=en-US`
    );

    if (!response.ok) {
      return Response.json({ collection: null }, { status: 200 });
    }

    // Shows don't have collections like movies do, but we can return related shows or similar
    return Response.json({ collection: null }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch show collections:', error);
    return Response.json({ collection: null }, { status: 200 });
  }
}
