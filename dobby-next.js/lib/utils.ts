import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createClient } from "@/lib/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function addTrackToRecentlySearched(userId: string, trackId: number, trackType: 'movie' | 'show') {
  const supabase = createClient();

  try {
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Recently Searched')
      .single();

    if (watchlistError) {
      console.error('Error fetching "Recently Searched" watchlist:', watchlistError);
      return;
    }

    if (watchlistData) {
      const { error: insertError } = await supabase
        .from('watchlist_items')
        .insert({
          watchlist_id: watchlistData.id,
          movie_id: trackType === 'movie' ? trackId : null,
          show_id: trackType === 'show' ? trackId : null,
        })
        .select();

      if (insertError && insertError.code !== '23505') { // 23505 is unique_violation
        console.error(`Error inserting ${trackType} into "Recently Searched":`, insertError);
      }
    }
  } catch (error) {
    console.error('Unexpected error in addTrackToRecentlySearched:', error);
  }
}
