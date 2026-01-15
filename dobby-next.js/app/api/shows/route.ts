import { NextResponse } from 'next/server';
import { Show } from '@/lib/types/Show';
import { get_options } from '@/lib/TMDB_API/requestOptions';
import { buildTmdbQueryVariants, rankByQuery } from '@/lib/search/smartSearch';

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

    const tmdbSearch = async (q: string, p: string) => {
      const u = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(q)}&page=${p}`;
      const response = await fetch(u, get_options);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.status_message || 'TMDB search failed');
      }
      return response.json();
    };

    // Fetch shows from TMDB API
    try {
      const data = await tmdbSearch(query, page);

      let shows: Show[] = (data.results ?? []) as Show[];

      // If TMDB returns nothing (common with typos), fetch extra candidates via query variants.
      if (shows.length === 0) {
        const variants = buildTmdbQueryVariants(query);
        const variantData = await Promise.all(
          variants.map(async (v) => {
            try {
              const vd = await tmdbSearch(v, '1');
              return (vd.results ?? []) as Show[];
            } catch {
              return [] as Show[];
            }
          })
        );

        const combined = variantData.flat();
        shows = Array.from(new Map(combined.map((s) => [s.id, s])).values());

        shows = rankByQuery(shows, query, (s) => [s.name, (s as any).original_name]);

        return NextResponse.json({
          results: shows,
          page: 1,
          total_pages: 1,
          total_results: shows.length,
        });
      }

      shows = rankByQuery(shows, query, (s) => [s.name, (s as any).original_name]);

      return NextResponse.json({
        results: shows,
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
      });
    } catch (error) {
      console.error('Error fetching shows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shows' },
        { status: 500 }
      );
    }
}