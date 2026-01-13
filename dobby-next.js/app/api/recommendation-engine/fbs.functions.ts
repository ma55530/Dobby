// dobby-next.js/app/api/recommendation-engine/helpers.ts

import { Movie } from "@/lib/types/Movie";
import { Show } from "@/lib/types/Show";
import { Movies } from "@/lib/types/Movies";
import { Shows } from "@/lib/types/Shows";
import {
  MOVIE_FILTER_CONFIG,
  SHOW_FILTER_CONFIG,
  FilterConfig,
} from "@/lib/config/recommendation";

// --- Helpers ---

export function isBadMovie(movie: Movie | Movies, config: FilterConfig = MOVIE_FILTER_CONFIG): boolean {
  const yearStr = movie.release_date?.split("-")[0];
  const safeYear = yearStr ? parseInt(yearStr) || 0 : 0;
  return (
    movie.vote_average < config.minVoteAverage ||
    safeYear < config.minYear ||
    (movie.vote_average < config.midTierVoteAverage && safeYear <= config.midTierYear)
  );
}

export function isBadShow(show: Show | Shows, config: FilterConfig = SHOW_FILTER_CONFIG): boolean {
  const yearStr = show.first_air_date?.split("-")[0];
  const safeYear = yearStr ? parseInt(yearStr) || 0 : 0;
  return (
    show.vote_average < config.minVoteAverage ||
    safeYear < config.minYear ||
    (show.vote_average < config.midTierVoteAverage && safeYear <= config.midTierYear)
  );
}

export async function fetchMissingDetails<T>(
  ids: number[],
  type: "movies" | "shows",
  reqUrl: string,
  headers: HeadersInit
): Promise<T[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(new URL(`/api/${type}/${id}`, reqUrl).toString(), { headers });
        if (res.ok) return (await res.json()) as T;
      } catch (e) {
        console.error(`Failed to fetch ${type}/${id}`, e);
      }
      return null;
    })
  );
  return results.filter((item): item is Awaited<T> => Boolean(item));
}

export async function findBetterSimilar(
  id: number,
  type: "movies" | "shows",
  reqUrl: string,
  headers: HeadersInit,
  isBadFunc: (item: any) => boolean
): Promise<any | null> {
  try {
    const res = await fetch(new URL(`/api/${type}/${id}/similar`, reqUrl).toString(), { headers });
    if (!res.ok) return null;
    
    const similarItems: any[] = await res.json();
    const candidates = similarItems
      .filter((item: any) => item.id !== id)
      .sort((a, b) => b.popularity - a.popularity); // Simple popularity sort

    // Find first good candidate
    const bestMatch = candidates.find((item) => !isBadFunc(item));
    
    if (bestMatch) {
      // Fetch full details of the replacement
      const detailRes = await fetch(new URL(`/api/${type}/${bestMatch.id}`, reqUrl).toString(), { headers });
      if (detailRes.ok) return await detailRes.json();
    }
  } catch (e) {
    console.error(`Error replacing ${type} ${id}:`, e);
  }
  return null;
}
