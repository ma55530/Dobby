import { NextResponse } from 'next/server';
import { Movies } from '@/lib/types/Movies';
import { get_options } from '@/lib/TMDB_API/requestOptions';
import { buildTmdbQueryVariants, rankByQuery } from '@/lib/search/smartSearch';

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

  const tmdbSearch = async (q: string, p: string): Promise<Record<string, unknown>> => {
    const u = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(q)}&page=${p}`;
    const response = await fetch(u, get_options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.status_message || 'TMDB search failed');
    }
    return response.json();
  };

  try {
    const data = await tmdbSearch(query, page);

    let movies: Movies[] = (data.results ?? []) as Movies[];

    // If TMDB returns nothing (common with typos), fetch extra candidates via query variants.
    if (movies.length === 0) {
      const variants = buildTmdbQueryVariants(query);
      const variantData = await Promise.all(
        variants.map(async (v: string): Promise<Movies[]> => {
          try {
            const vd = await tmdbSearch(v, '1');
            return (vd.results ?? []) as Movies[];
          } catch {
            return [] as Movies[];
          }
        })
      );

      const combined = variantData.flat();
      movies = Array.from(new Map(combined.map((m) => [m.id, m])).values());

      // Rank locally so best match comes first.
      movies = rankByQuery(movies, query, (m: Movies) => [m.title, (m as unknown as Record<string, unknown>).original_title as string]);

      return NextResponse.json({
        results: movies,
        page: 1,
        total_pages: 1,
        total_results: movies.length,
      });
    }

    // Rank the returned page to improve ordering.
    movies = rankByQuery(movies, query, (m: Movies) => [m.title, (m as unknown as Record<string, unknown>).original_title as string]);

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