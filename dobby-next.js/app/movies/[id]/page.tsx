"use client";

import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState, use } from "react";
import { Movie } from "@/lib/types/Movie";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Plus, ChevronDown, Share2 } from "lucide-react";
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
import { ShareDialog } from "@/components/ShareDialog";

interface MoviePageProps {
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

export default function MoviePage({ params }: MoviePageProps) {
  const { id } = use(params);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [checkingWatchlist, setCheckingWatchlist] = useState(true);
  const [availableWatchlists, setAvailableWatchlists] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingWatchlists, setLoadingWatchlists] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [creatingNewWatchlist, setCreatingNewWatchlist] = useState(false);
  const [watchlistsWithItem, setWatchlistsWithItem] = useState<string[]>([]);
  const [hoveredWatchlistId, setHoveredWatchlistId] = useState<string | null>(null);
  const [collection, setCollection] = useState<any>(null);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`/api/movies/${id}`);
        if (!res.ok) {
          setError("Movie not found");
          setLoading(false);
          return;
        }
        const data: Movie = await res.json();
        setMovie(data);
      } catch (err) {
        setError("Failed to load movie details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const data = await res.json();
          const containingIds: string[] = (data.watchlists || [])
            .filter((watchlist: any) =>
              (watchlist.items || []).some((item: WatchlistItem) => item.type === 'movie' && item.id === parseInt(id))
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
    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/movies/${id}/collections`);
        if (res.ok) {
          const data = await res.json();
          setCollection(data?.collection || null);
        }
      } catch (err) {
        console.error('Failed to fetch collection:', err);
        setCollection(null);
      } finally {
        setLoadingCollection(false);
      }
    };

    fetchCollection();
  }, [id]);

  const handleOpenWatchlistDialog = async () => {
    setLoadingWatchlists(true);
    
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        setAvailableWatchlists(data.watchlists || []);
      } else {
        setWatchlistMessage({ type: 'error', text: 'Please log in first' });
        setTimeout(() => setWatchlistMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Failed to load watchlists' });
      setTimeout(() => setWatchlistMessage(null), 3000);
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
        body: JSON.stringify({ movieId: parseInt(id), watchlistName }),
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
          setWatchlistMessage({ type: 'error', text: 'Already in this watchlist' });
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
          body: JSON.stringify({ movieId: parseInt(id), watchlistName }),
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
    if (!newWatchlistName.trim()) {
      setWatchlistMessage({ type: 'error', text: 'Please enter a watchlist name' });
      setTimeout(() => setWatchlistMessage(null), 3000);
      return;
    }

    setCreatingNewWatchlist(true);

    try {
      const createRes = await fetch('/api/watchlist/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        setWatchlistMessage({ type: 'error', text: data.error || 'Failed to create watchlist' });
        setTimeout(() => setWatchlistMessage(null), 3000);
        setCreatingNewWatchlist(false);
        return;
      }

      const created = await createRes.json();
      if (created.watchlist) {
        setAvailableWatchlists((prev) => {
          const exists = prev.some((w) => w.id === created.watchlist.id);
          return exists ? prev : [...prev, created.watchlist];
        });
      }
      await handleAddToSpecificWatchlist(newWatchlistName.trim());
      setNewWatchlistName('');
      setCreateDialogOpen(false);
    } catch (err) {
      console.error(err);
      setWatchlistMessage({ type: 'error', text: 'Failed to create watchlist' });
      setTimeout(() => setWatchlistMessage(null), 3000);
    } finally {
      setCreatingNewWatchlist(false);
    }
  };

  const handleAddToWatchlist = async () => {
    setAddingToWatchlist(true);
    setWatchlistMessage(null);

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: parseInt(id) }),
      });

      const data = await res.json();

      if (res.ok) {
        setWatchlistMessage({ type: 'success', text: 'Added to watchlist!' });
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

  const handleRemoveFromWatchlist = async () => {
    setAddingToWatchlist(true);
    setWatchlistMessage(null);

    try {
      const res = await fetch(`/api/watchlist?movieId=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setWatchlistMessage({ type: 'success', text: 'Removed from watchlist!' });
        setIsInWatchlist(false);
        setWatchlistsWithItem([]);
        setTimeout(() => setWatchlistMessage(null), 3000);
      } else {
        const data = await res.json();
        setWatchlistMessage({ type: 'error', text: data.error || 'Failed to remove' });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-red-500">{error || "Movie not found"}</p>
        <Link href="/movies">
          <Button variant="outline">Back to Movies</Button>
        </Link>
      </div>
    );
  }

  const backdropUrl = movie.backdrop_path ? getImageUrl(movie.backdrop_path, 'large') : null;
  const posterUrl = movie.poster_path ? getImageUrl(movie.poster_path) : "/assets/placeholder-movie.png";
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Backdrop */}
      {backdropUrl && (
        <div className="relative h-64 md:h-96 w-full overflow-hidden">
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            sizes="100vw"
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
                alt={movie.title}
                fill
                sizes="192px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title and Year */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{movie.title}</h1>
              {movie.original_title && movie.original_title !== movie.title && (
                <p className="text-gray-400 text-lg">{movie.original_title}</p>
              )}
            </div>

            {/* Rating and Release Date */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-yellow-500">★</span>
                <span className="text-2xl font-bold">{movie.vote_average.toFixed(1)}</span>
                <span className="text-gray-400">/ 10</span>
              </div>
              {movie.release_date && (
                <Badge variant="outline" className="text-base py-2 px-3">
                  {format(new Date(movie.release_date), "MMMM yyyy")}
                </Badge>
              )}
            </div>

            {/* Watchlist Button */}
            <div className="flex items-center gap-3">
              {!checkingWatchlist && (
                <DropdownMenu onOpenChange={(open) => {
                  if (open) {
                    handleOpenWatchlistDialog();
                  }
                }}>
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
              
              {/* Share Button */}
              <Button
                onClick={() => setShareDialogOpen(true)}
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white cursor-pointer"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
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
                  <DialogDescription className="text-gray-400">
                    Create a new watchlist and add this movie to it.
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
                      onClick={() => {
                        setCreateDialogOpen(false);
                        setNewWatchlistName('');
                      }}
                      variant="outline"
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAndAddToWatchlist}
                      disabled={creatingNewWatchlist || !newWatchlistName.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {creatingNewWatchlist ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        'Create & Add'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Runtime and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-400">Runtime</p>
                <p className="text-lg font-semibold">{runtime}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-400">Status</p>
                <p className="text-lg font-semibold">{movie.status}</p>
              </div>
            </div>

            
            
          </div>
        </div>

        {/* Overview */}
        {movie.overview && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed text-lg">{movie.overview}</p>
          </div>
        )}

        {/* Collection */}
        {collection && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Part of Collection</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-purple-400">{collection.name}</h3>
              {collection.overview && (
                <p className="text-gray-300">{collection.overview}</p>
              )}
              {collection.parts && collection.parts.length > 0 && (
                <div>
                  <p className="text-sm uppercase tracking-wider text-gray-400 mb-3">Collection Items</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collection.parts.map((part: any) => (
                      <Link key={part.id} href={`/movies/${part.id}`}>
                        <div className="bg-slate-700 hover:bg-slate-600 rounded-lg p-3 cursor-pointer transition-colors">
                          <p className="text-white font-semibold">{part.title}</p>
                          {part.release_date && (
                            <p className="text-sm text-gray-400">{format(new Date(part.release_date), "yyyy")}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Production Companies */}
          {movie.production_companies && movie.production_companies.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Production Companies</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {movie.production_companies.map((company) => (
                  <div key={company.id} className="flex flex-col items-center gap-2">
                    {company.logo_path ? (
                      <div className="relative w-24 h-12 bg-white rounded p-2 flex items-center justify-center">
                        <Image
                          src={getImageUrl(company.logo_path)}
                          alt={company.name}
                          fill
                          sizes="96px"
                          className="object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-12 bg-gray-400 rounded p-2 flex items-center justify-center">
                        <p className="text-xs text-gray-700 text-center font-semibold">No logo</p>
                      </div>
                    )}
                    <p className="text-gray-300 text-center text-sm">{company.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spoken Languages */}
          {movie.spoken_languages && movie.spoken_languages.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Languages</h3>
              <div className="space-y-2">
                {movie.spoken_languages.map((lang) => (
                  <p key={lang.iso_639_1} className="text-gray-300">
                    {lang.english_name}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-12">
          <Link href="/movies">
            <Button variant="outline">← Back to Movies</Button>
          </Link>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        itemType="movie"
        itemId={parseInt(id)}
        title={movie.title}
        posterPath={movie.poster_path}
        rating={movie.vote_average}
        year={movie.release_date ? format(new Date(movie.release_date), "yyyy") : ""}
      />
    </div>
  );
}
