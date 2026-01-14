"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Calendar, Star, Film, Tv, Trash2, Plus } from "lucide-react";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [creatingWatchlist, setCreatingWatchlist] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWatchlist, setDeletingWatchlist] = useState(false);

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
      const res = await fetch(`/api/watchlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [item.type === 'movie' ? 'movieId' : 'showId']: item.id,
          watchlistName: currentWatchlist?.name,
        }),
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
  const allItems = currentWatchlist?.items || [];
  
  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      setError('Please enter a watchlist name');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCreatingWatchlist(true);

    try {
      const res = await fetch('/api/watchlist/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => [...prev, { id: data.watchlist.id, name: data.watchlist.name, items: [] }]);
        setSelectedWatchlist(data.watchlist.id);
        setNewWatchlistName('');
        setCreateDialogOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create watchlist');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create watchlist');
      setTimeout(() => setError(null), 3000);
    } finally {
      setCreatingWatchlist(false);
    }
  };

  const handleDeleteWatchlist = async () => {
    if (!selectedWatchlist || !currentWatchlist) return;

    setDeletingWatchlist(true);

    try {
      const res = await fetch(`/api/watchlist/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlistId: selectedWatchlist }),
      });

      if (res.ok) {
        const newWatchlists = watchlists.filter(w => w.id !== selectedWatchlist);
        setWatchlists(newWatchlists);
        setSelectedWatchlist(newWatchlists.length > 0 ? newWatchlists[0].id : null);
        setDeleteDialogOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete watchlist');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete watchlist');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingWatchlist(false);
    }
  };

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
                  className="block cursor-pointer"
                >
                  <div className="flex gap-4">
                  {/* Poster */}
                  <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
                    {item.poster_path ? (
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
                        fill
                        sizes="96px"
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
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/80 hover:bg-red-700 text-white z-10 cursor-pointer"
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
            {/* Create Watchlist Button */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Watchlist
                </Button>
              </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Create New Watchlist</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Give your watchlist a name like &quot;Best stuff for when I&apos;m sad&quot;
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="watchlistName" className="text-gray-300">
                        Watchlist Name
                      </Label>
                      <Input
                        id="watchlistName"
                        value={newWatchlistName}
                        onChange={(e) => setNewWatchlistName(e.target.value)}
                        placeholder="e.g., Best stuff for when I'm sad"
                        className="bg-zinc-800 border-zinc-700 text-white mt-2 cursor-text"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateWatchlist();
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          setCreateDialogOpen(false);
                          setNewWatchlistName('');
                        }}
                        variant="outline"
                        className="border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateWatchlist}
                        disabled={creatingWatchlist || !newWatchlistName.trim()}
                        className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
                      >
                        {creatingWatchlist ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

            {/* Watchlist Tabs */}
            {watchlists.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {watchlists.map((watchlist) => (
                  <div
                    key={watchlist.id}
                    className={`group rounded-lg font-medium transition-all cursor-pointer flex items-center pl-4 pr-2 py-2 ${
                      selectedWatchlist === watchlist.id
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-800/60 text-gray-300 hover:bg-zinc-700"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedWatchlist(watchlist.id)}
                      className="flex-1 text-left flex items-center cursor-pointer"
                    >
                      {watchlist.name}
                      <span className="ml-2 text-sm opacity-75">
                        ({watchlist.items.length})
                      </span>
                    </button>
                    
                    {/* Delete icon on hover - inside border, to the right */}
                    {selectedWatchlist === watchlist.id && (
                      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogTrigger asChild>
                          <button
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-300 cursor-pointer flex items-center"
                            title="Delete watchlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                          <DialogHeader>
                            <DialogTitle>Delete Watchlist</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Are you sure you want to delete &quot;{watchlist.name}&quot;? This will remove all {watchlist.items.length} items in it. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              onClick={() => setDeleteDialogOpen(false)}
                              variant="outline"
                              className="border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleDeleteWatchlist}
                              disabled={deletingWatchlist}
                              className="bg-red-600 hover:bg-red-700 cursor-pointer"
                            >
                              {deletingWatchlist ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Watchlist Items - All Together */}
            {currentWatchlist && (
              <div className="space-y-4">
                {allItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bookmark className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg mb-2">This watchlist is empty</p>
                    <p className="text-gray-500 text-sm">
                      Add some movies or shows to get started
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Bookmark className="w-6 h-6 text-purple-400" />
                      <h2 className="text-2xl font-bold text-white">All Items ({allItems.length})</h2>
                    </div>
                    {renderItemsGrid(allItems)}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
