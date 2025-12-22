"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Calendar, Star, Film, Tv, Trash2 } from "lucide-react";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { Button } from "@/components/ui/button";

interface WatchlistItem {
  type: 'movie' | 'show';
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  added_at: string;
}

interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchWatchlists = async () => {
      try {
        const res = await fetch("/api/watchlist");
        if (!res.ok) {
          if (res.status === 401) {
            setError("Please log in to view your watchlists");
          } else {
            setError("Failed to load watchlists");
          }
          return;
        }
        const data = await res.json();
        setWatchlists(data.watchlists || []);
        if (data.watchlists && data.watchlists.length > 0) {
          setSelectedWatchlist(data.watchlists[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load watchlists");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlists();
  }, []);

  const handleRemoveFromWatchlist = async (item: WatchlistItem) => {
    const itemKey = `${item.type}-${item.id}`;
    setRemovingItems(prev => new Set(prev).add(itemKey));

    try {
      const res = await fetch(`/api/watchlist?${item.type === 'movie' ? 'movieId' : 'showId'}=${item.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Update local state to remove the item
        setWatchlists(prevWatchlists => 
          prevWatchlists.map(watchlist => ({
            ...watchlist,
            items: watchlist.items.filter(i => !(i.type === item.type && i.id === item.id))
          }))
        );
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove item');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to remove item');
      setTimeout(() => setError(null), 3000);
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const currentWatchlist = watchlists.find(w => w.id === selectedWatchlist);
  const currentMovies = currentWatchlist?.items.filter(item => item.type === 'movie') || [];
  const currentShows = currentWatchlist?.items.filter(item => item.type === 'show') || [];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const renderItemsGrid = (items: WatchlistItem[]) => (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-800/60 rounded-xl border border-zinc-700">
          <Bookmark className="w-12 h-12 text-gray-600 mb-3" />
          <p className="text-gray-400">No items in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const itemKey = `${item.type}-${item.id}`;
            const isRemoving = removingItems.has(itemKey);
            
            return (
              <div
                key={itemKey}
                className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 relative group"
              >
                <Link
                  href={`/${item.type === 'movie' ? 'movies' : 'shows'}/${item.id}`}
                  className="block"
                >
                  <div className="flex gap-4">
                  {/* Poster */}
                  <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
                    {item.poster_path ? (
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        {item.type === 'movie' ? (
                          <Film className="w-8 h-8" />
                        ) : (
                          <Tv className="w-8 h-8" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-white font-semibold text-lg leading-tight group-hover:text-purple-400 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1 text-yellow-400 flex-shrink-0">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">
                          {item.vote_average.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {item.release_date && (
                      <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.release_date)}</span>
                      </div>
                    )}

                    <p className="text-gray-400 text-sm line-clamp-3 mb-2">
                      {item.overview || "No description available"}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.type === 'movie' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {item.type === 'movie' ? 'Movie' : 'TV Show'}
                      </span>
                      {item.added_at && (
                        <span className="text-xs text-gray-500">
                          Added {formatDate(item.added_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                </Link>

                {/* Remove Button */}
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFromWatchlist(item);
                  }}
                  disabled={isRemoving}
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/80 hover:bg-red-700 text-white z-10"
                >
                  {isRemoving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">
      <section className="w-full px-6 pt-12 pb-6 max-w-7xl">
        <div className="flex items-center gap-3 mb-2">
          <Bookmark className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">My Watchlists</h1>
        </div>
        <p className="text-gray-300 mt-2">Keep track of movies and shows you want to watch</p>
        {error && (
          <div className="mt-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </section>

      <section className="w-full px-6 max-w-7xl pb-16">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-400 text-lg">Loading your watchlists...</div>
          </div>
        ) : watchlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bookmark className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-2">No watchlists yet</p>
            <p className="text-gray-500 text-sm">
              Start adding movies and shows to your watchlist
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Watchlist Tabs */}
            {watchlists.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {watchlists.map((watchlist) => (
                  <button
                    key={watchlist.id}
                    onClick={() => setSelectedWatchlist(watchlist.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedWatchlist === watchlist.id
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-800/60 text-gray-300 hover:bg-zinc-700"
                    }`}
                  >
                    {watchlist.name}
                    <span className="ml-2 text-sm opacity-75">
                      ({watchlist.items.length})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Watchlist Items - Separated by Type */}
            {currentWatchlist && (
              <div className="space-y-8">
                {/* Movies Section */}
                {currentMovies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Film className="w-6 h-6 text-blue-400" />
                      <h2 className="text-2xl font-bold text-white">Movies ({currentMovies.length})</h2>
                    </div>
                    {renderItemsGrid(currentMovies)}
                  </div>
                )}

                {/* Shows Section */}
                {currentShows.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Tv className="w-6 h-6 text-purple-400" />
                      <h2 className="text-2xl font-bold text-white">TV Shows ({currentShows.length})</h2>
                    </div>
                    {renderItemsGrid(currentShows)}
                  </div>
                )}

                {/* Empty state */}
                {currentMovies.length === 0 && currentShows.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bookmark className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg mb-2">This watchlist is empty</p>
                    <p className="text-gray-500 text-sm">
                      Add some movies or shows to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
