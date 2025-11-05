"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ListFilter } from "lucide-react";
import { Movie } from "@/lib/types/Movie";
import { Show } from "@/lib/types/Show";
import TrackCard from "@/components/tracks/TrackCard";
import { useRouter } from "next/navigation";
import { addTrackToRecentlySearched } from "@/lib/utils";

interface Watchlist {
  id: number;
  name: string;
}

interface WatchlistItem {
  movie_id: number | null;
  show_id: number | null;
}

interface TrackWithDetails {
  id: number;
  title?: string;
  original_name?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  details?: Movie | Show;
}

export default function WatchlistDropdown() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<TrackWithDetails[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    const fetchWatchlists = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('watchlists')
        .select('id, name')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching watchlists:', error);
      } else {
        setWatchlists(data);
        // Automatically select "Recently Searched" if it exists
        const recentlySearched = data.find(wl => wl.name === 'Recently Searched');
        if (recentlySearched) {
          setSelectedWatchlist(recentlySearched);
        } else if (data.length > 0) {
          setSelectedWatchlist(data[0]);
        }
      }
    };

    fetchWatchlists();
  }, [userId, supabase]);

  useEffect(() => {
    const fetchWatchlistItems = async () => {
      if (!selectedWatchlist) {
        setWatchlistItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('watchlist_items')
        .select('movie_id, show_id')
        .eq('watchlist_id', selectedWatchlist.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching watchlist items:', error);
        setWatchlistItems([]);
        return;
      }

      const fetchedTracks: TrackWithDetails[] = [];
      for (const item of data) {
        if (item.movie_id) {
          const res = await fetch(`/api/movies/${item.movie_id}`);
          if (res.ok) {
            const movieData: Movie = await res.json();
            fetchedTracks.push({ ...movieData, details: movieData });
          }
        } else if (item.show_id) {
          const res = await fetch(`/api/shows/${item.show_id}`);
          if (res.ok) {
            const showData: Show = await res.json();
            fetchedTracks.push({ ...showData, details: showData });
          }
        }
      }
      setWatchlistItems(fetchedTracks);
    };

    fetchWatchlistItems();
  }, [selectedWatchlist, supabase]);

  const handleTrackCardClick = async (trackId: number, trackType: 'movie' | 'show') => {
    if (userId) {
      await addTrackToRecentlySearched(userId, trackId, trackType);
    }
    router.push(`/${trackType}s/${trackId}`);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">My Watchlists</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ListFilter className="mr-2 h-4 w-4" />
              {selectedWatchlist ? selectedWatchlist.name : "Select Watchlist"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {watchlists.map((watchlist) => (
              <DropdownMenuItem key={watchlist.id} onClick={() => setSelectedWatchlist(watchlist)}>
                {watchlist.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap justify-start gap-6">
        {watchlistItems.length > 0 ? (
          watchlistItems.map((track) => (
            track.details && (
              <TrackCard
                id={track.id}
                key={track.id}
                title={track.title || track.original_name || 'N/A'}
                poster={track.poster_path}
                rating={track.vote_average}
                year={track.release_date || track.first_air_date}
                infoAboutTrack={track.runtime ? `${track.runtime}m` : track.number_of_seasons ? `${track.number_of_seasons} seasons` : 'N/A'}
                onClick={() => handleTrackCardClick(track.id, track.release_date ? 'movie' : 'show')}
              />
            )
          ))
        ) : (
          <p>No items in this watchlist.</p>
        )}
      </div>
    </div>
  );
}
