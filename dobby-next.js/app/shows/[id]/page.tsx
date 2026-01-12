"use client";

import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState, use } from "react";
import { Show } from "@/lib/types/Show";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Plus, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShowPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface WatchlistItem {
  type: 'movie' | 'show';
  id: number;
}

interface Watchlist {
  items: WatchlistItem[];
}

export default function ShowPage({ params }: ShowPageProps) {
  const { id } = use(params);
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [checkingWatchlist, setCheckingWatchlist] = useState(true);
  const [watchlistsWithItem, setWatchlistsWithItem] = useState<string[]>([]);
  const [availableWatchlists, setAvailableWatchlists] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingWatchlists, setLoadingWatchlists] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [creatingNewWatchlist, setCreatingNewWatchlist] = useState(false);
  const [hoveredWatchlistId, setHoveredWatchlistId] = useState<string | null>(null);

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const res = await fetch(`/api/shows/${id}`);
        if (!res.ok) {
          setError("Show not found");
          setLoading(false);
          return;
        }
        const data: Show = await res.json();
        setShow(data);
      } catch (err) {
        setError("Failed to load show details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShow();
  }, [id]);

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const data = await res.json();
          const containingIds: string[] = (data.watchlists || [])
            .filter((watchlist: any) =>
              (watchlist.items || []).some((item: WatchlistItem) => item.type === 'show' && item.id === parseInt(id))
            )
            .map((wl: any) => wl.id);
          setWatchlistsWithItem(containingIds);
          setIsInWatchlist(containingIds.length > 0);
        }
      } catch (err) {
        console.error('Failed to check watchlist:', err);
      } finally {
        setCheckingWatchlist(false);
      }
    };

    checkWatchlist();
  }, [id]);

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const data = await res.json();
          const inWatchlist = data.watchlists?.some((watchlist: Watchlist) =>
            watchlist.items?.some((item: WatchlistItem) => 
              item.type === 'show' && item.id === parseInt(id)
            )
          );
          setIsInWatchlist(inWatchlist);
        }
      } catch (err) {
        console.error('Failed to check watchlist:', err);
      } finally {
        setCheckingWatchlist(false);
      }
    };

    checkWatchlist();
  }, [id]);

  const handleAddToWatchlist = async () => {
    setAddingToWatchlist(true);
    setWatchlistMessage(null);

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: parseInt(id) }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsInWatchlist(true);
        setWatchlistMessage({ type: 'success', text: 'Added to watchlist!' });
        setTimeout(() => setWatchlistMessage(null), 3000);
      } else {
        if (res.status === 409) {
          setWatchlistMessage({ type: 'error', text: 'Already in watchlist' });
        } else if (res.status === 401) {
          setWatchlistMessage({ type: 'error', text: 'Please log in first' });
        } else {
          setWatchlistMessage({ type: 'error', text: data.error || 'Failed to add' });
        }
        setTimeout(() => setWatchlistMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Something went wrong' });
      setTimeout(() => setWatchlistMessage(null), 3000);
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    setAddingToWatchlist(true);
    setWatchlistMessage(null);

    try {
      const res = await fetch(`/api/watchlist?showId=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsInWatchlist(false);
        setWatchlistsWithItem([]);
        setWatchlistMessage({ type: 'success', text: 'Removed from watchlist' });
        setTimeout(() => setWatchlistMessage(null), 3000);
      } else {
        setWatchlistMessage({ type: 'error', text: 'Failed to remove' });
        setTimeout(() => setWatchlistMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Something went wrong' });
      setTimeout(() => setWatchlistMessage(null), 3000);
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const openWatchlistDropdown = async () => {
    setLoadingWatchlists(true);
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        const lists = (data.watchlists || []).map((wl: any) => ({ id: wl.id, name: wl.name }));
        setAvailableWatchlists(lists);
      }
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    } finally {
      setLoadingWatchlists(false);
    }
  };

  const handleAddToSpecificWatchlist = async (watchlistName: string) => {
    setAddingToWatchlist(true);
    setWatchlistMessage(null);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: parseInt(id), watchlistName }),
      });
      const data = await res.json();
      if (res.ok) {
        const wl = availableWatchlists.find((w) => w.name === watchlistName);
        if (wl && !watchlistsWithItem.includes(wl.id)) {
          setWatchlistsWithItem([...watchlistsWithItem, wl.id]);
        }
        setWatchlistMessage({ type: 'success', text: `Added to '${watchlistName}'!` });
        setIsInWatchlist(true);
        setTimeout(() => setWatchlistMessage(null), 3000);
      } else {
        if (res.status === 409) {
          setWatchlistMessage({ type: 'error', text: 'Already in watchlist' });
        } else if (res.status === 401) {
          setWatchlistMessage({ type: 'error', text: 'Please log in first' });
        } else {
          setWatchlistMessage({ type: 'error', text: data.error || 'Failed to add' });
        }
        setTimeout(() => setWatchlistMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Something went wrong' });
      setTimeout(() => setWatchlistMessage(null), 3000);
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleToggleWatchlistItem = async (watchlistName: string, isCurrentlyAdded: boolean) => {
    setAddingToWatchlist(true);
    setWatchlistMessage(null);

    try {
      if (isCurrentlyAdded) {
        // Remove from this specific watchlist
        const res = await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showId: parseInt(id), watchlistName }),
        });

        if (res.ok) {
          const wl = availableWatchlists.find((w) => w.name === watchlistName);
          if (wl) {
            setWatchlistsWithItem(watchlistsWithItem.filter((wlId) => wlId !== wl.id));
          }
          setWatchlistMessage({ type: 'success', text: `Removed from '${watchlistName}'` });
          setTimeout(() => setWatchlistMessage(null), 3000);
        } else {
          setWatchlistMessage({ type: 'error', text: 'Failed to remove' });
          setTimeout(() => setWatchlistMessage(null), 3000);
        }
      } else {
        // Add to watchlist
        await handleAddToSpecificWatchlist(watchlistName);
      }
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Something went wrong' });
      setTimeout(() => setWatchlistMessage(null), 3000);
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleCreateAndAddToWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    setCreatingNewWatchlist(true);
    try {
      const res = await fetch('/api/watchlist/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const created = data.watchlist;
        if (created) {
          setAvailableWatchlists((prev) => {
            const exists = prev.some((w) => w.id === created.id);
            return exists ? prev : [...prev, created];
          });
        }
        await handleAddToSpecificWatchlist(created?.name ?? newWatchlistName.trim());
        setCreateDialogOpen(false);
        setNewWatchlistName("");
      } else {
        setWatchlistMessage({ type: 'error', text: data.error || 'Failed to create' });
        setTimeout(() => setWatchlistMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Something went wrong' });
      setTimeout(() => setWatchlistMessage(null), 3000);
    } finally {
      setCreatingNewWatchlist(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading show details...</p>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-red-500">{error || "Show not found"}</p>
        <Link href="/shows">
          <Button variant="outline">Back to Shows</Button>
        </Link>
      </div>
    );
  }

  const backdropUrl = show.backdrop_path ? getImageUrl(show.backdrop_path, 'large') : null;
  const posterUrl = show.poster_path ? getImageUrl(show.poster_path) : "/assets/placeholder-movie.png";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Backdrop */}
      {backdropUrl && (
        <div className="relative h-64 md:h-96 w-full overflow-hidden">
          <Image
            src={backdropUrl}
            alt={show.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="md:col-span-1 flex justify-center">
            <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={posterUrl}
                alt={show.name}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title and Year */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{show.name}</h1>
              {show.original_name && show.original_name !== show.name && (
                <p className="text-gray-400 text-lg">{show.original_name}</p>
              )}
            </div>

            {/* Rating and Release Date */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-yellow-500">★</span>
                <span className="text-2xl font-bold">{show.vote_average.toFixed(1)}</span>
                <span className="text-gray-400">/ 10</span>
              </div>
              {show.first_air_date && (
                <Badge variant="outline" className="text-base py-2 px-3">
                  {format(new Date(show.first_air_date), "MMMM yyyy")}
                </Badge>
              )}
              {show.last_air_date && (
                <Badge variant="outline" className="text-base py-2 px-3">
                  {format(new Date(show.last_air_date), "MMMM yyyy")}
                </Badge>
              )}
              {show.status && (
                <Badge 
                  variant="outline" 
                  className={`text-base py-2 px-3 ${
                    show.status === "Returning Series" 
                      ? "bg-green-900/50 text-green-300 border-green-700" 
                      : "bg-orange-900/50 text-orange-300 border-orange-700"
                  }`}
                >
                  {show.status}
                </Badge>
              )}
            </div>

            {/* Watchlist Button / Dropdown */
            }
            <div className="flex items-center gap-3">
              {!checkingWatchlist && (
                <DropdownMenu onOpenChange={(open) => { if (open) openWatchlistDropdown(); }}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={addingToWatchlist}
                      className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      Add to Watchlist
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-zinc-900 border-zinc-700 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel className="text-gray-300">Choose Watchlist</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    {loadingWatchlists ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                      </div>
                    ) : availableWatchlists.length === 0 ? (
                      <DropdownMenuItem
                        onClick={() => setCreateDialogOpen(true)}
                        className="text-gray-300 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Watchlist
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {availableWatchlists.map((watchlist) => (
                          <DropdownMenuItem
                            key={watchlist.id}
                            onClick={() => handleToggleWatchlistItem(watchlist.name, watchlistsWithItem.includes(watchlist.id))}
                            disabled={addingToWatchlist}
                            className="text-gray-300 hover:bg-zinc-800 cursor-pointer"
                            onMouseEnter={() => setHoveredWatchlistId(watchlist.id)}
                            onMouseLeave={() => setHoveredWatchlistId(null)}
                          >
                            {watchlistsWithItem.includes(watchlist.id) ? (
                              <>
                                <BookmarkCheck className={`w-4 h-4 mr-2 transition-colors ${
                                  hoveredWatchlistId === watchlist.id ? 'text-red-400' : 'text-green-400'
                                }`} />
                                {watchlist.name}
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-4 h-4 mr-2" />
                                {watchlist.name}
                              </>
                            )}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-zinc-700" />
                        <DropdownMenuItem
                          onClick={() => setCreateDialogOpen(true)}
                          className="text-gray-300 hover:bg-zinc-800 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Watchlist
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {watchlistMessage && (
                <span className={`text-sm ${
                  watchlistMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {watchlistMessage.type === 'success' && <BookmarkCheck className="w-4 h-4 inline mr-1" />}
                  {watchlistMessage.text}
                </span>
              )}
            </div>
            {/* Create New Watchlist Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Watchlist</DialogTitle>
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
                      placeholder="Enter watchlist name"
                      className="bg-zinc-800 border-zinc-700 text-white mt-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateAndAddToWatchlist();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      className="border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      disabled={creatingNewWatchlist || !newWatchlistName.trim()}
                      onClick={handleCreateAndAddToWatchlist}
                    >
                      {creatingNewWatchlist ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        'Create and Add'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {show.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Series Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-400">Seasons</p>
                <p className="text-lg font-semibold">{show.number_of_seasons}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-400">Episodes</p>
                <p className="text-lg font-semibold">{show.number_of_episodes}</p>
              </div>
              {show.episode_run_time && show.episode_run_time.length > 0 && (
                <div>
                  <p className="text-sm uppercase tracking-wider text-gray-400">Episode Length</p>
                  <p className="text-lg font-semibold">{show.episode_run_time[0]}m</p>
                </div>
              )}
            </div>

            {/* Type and Production Countries */}
            <div className="grid grid-cols-2 gap-4">
              {show.type && (
                <div>
                  <p className="text-sm uppercase tracking-wider text-gray-400">Type</p>
                  <p className="text-lg font-semibold">{show.type}</p>
                </div>
              )}
              {show.origin_country && show.origin_country.length > 0 && (
                <div>
                  <p className="text-sm uppercase tracking-wider text-gray-400">Country</p>
                  <p className="text-lg font-semibold">{show.origin_country.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview */}
        {show.overview && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed text-lg">{show.overview}</p>
          </div>
        )}

        {/* Created By */}
        {show.created_by && show.created_by.length > 0 && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4">Created By</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {show.created_by.map((creator) => (
                <div key={creator.id} className="flex items-center gap-3">
                  {creator.profile_path && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden">
                      <Image
                        src={getImageUrl(creator.profile_path)}
                        alt={creator.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-gray-300">{creator.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Networks */}
        {show.networks && show.networks.length > 0 && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4">Networks</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {show.networks.map((network) => (
                <div key={network.id} className="flex flex-col items-center gap-2">
                  {network.logo_path ? (
                    <div className="relative w-24 h-12 bg-white rounded p-2 flex items-center justify-center">
                      <Image
                        src={getImageUrl(network.logo_path)}
                        alt={network.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-12 bg-gray-400 rounded p-2 flex items-center justify-center">
                      <p className="text-xs text-gray-700 text-center font-semibold">No logo</p>
                    </div>
                  )}
                  <p className="text-gray-300 text-center">{network.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production Companies */}
        {show.production_companies && show.production_companies.length > 0 && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4">Production Companies</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {show.production_companies.map((company) => (
                <div key={company.id} className="flex flex-col items-center gap-2">
                  {company.logo_path ? (
                    <div className="relative w-24 h-12 bg-white rounded p-2 flex items-center justify-center">
                      <Image
                        src={getImageUrl(company.logo_path)}
                        alt={company.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-12 bg-gray-400 rounded p-2 flex items-center justify-center">
                      <p className="text-xs text-gray-700 text-center font-semibold">No logo</p>
                    </div>
                  )}
                  <p className="text-gray-300 text-center">{company.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {show.spoken_languages && show.spoken_languages.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Languages</h3>
              <div className="space-y-2">
                {show.spoken_languages.map((lang) => (
                  <p key={lang.iso_639_1} className="text-gray-300">
                    {lang.english_name}
                  </p>
                ))}
              </div>
            </div>

            {/* Last Episode Info */}
            {show.last_episode_to_air && (
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Last Episode</h3>
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <span className="font-semibold">S{show.last_episode_to_air.season_number}E{show.last_episode_to_air.episode_number}</span> - {show.last_episode_to_air.name}
                  </p>
                  {show.last_episode_to_air.air_date && (
                    <p className="text-gray-400 text-sm">
                      {format(new Date(show.last_episode_to_air.air_date), "MMMM dd, yyyy")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12">
          <Link href="/shows">
            <Button variant="outline">← Back to Shows</Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 

