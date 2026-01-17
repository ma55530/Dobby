/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { rankByQuery } from "@/lib/search/smartSearch";

interface MovieResult {
  id: number;
  title: string;
  type: "movie" | "tv";
  poster_path?: string;
}

type MoviesSearchResponse = {
  results: any[];
  page: number;
  total_pages: number;
  total_results: number;
};

type ShowsSearchResponse = {
  results: any[];
  page: number;
  total_pages: number;
  total_results: number;
};

export default function CreateReview() {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<MovieResult | null>(null);
  const [movieSearch, setMovieSearch] = useState("");
  const [filteredMovies, setFilteredMovies] = useState<MovieResult[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    const normalizedQuery = movieSearch.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) {
      setFilteredMovies([]);
      setLoadingMovies(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;

    const timeoutId = setTimeout(async () => {
      setLoadingMovies(true);
      try {
        const q = encodeURIComponent(normalizedQuery);

        // Search both movies and shows in parallel
        const [moviesRes, showsRes] = await Promise.all([
          fetch(`/api/movies?query=${q}&page=1`),
          fetch(`/api/shows?query=${q}&page=1`),
        ]);

        const allResults: MovieResult[] = [];

        // Process movies
        if (moviesRes.ok) {
          const moviesData: MoviesSearchResponse = await moviesRes.json();
          const movies: MovieResult[] = (moviesData.results ?? [])
            .filter((movie: any) => movie.release_date && movie.vote_average !== 0)
            // Pull more candidates; we fuzzy-rank locally.
            .slice(0, 20)
            .map((movie: any) => ({
              id: movie.id,
              title: movie.title,
              type: "movie" as const,
              poster_path: movie.poster_path,
            }));
          allResults.push(...movies);
        }

        // Process shows
        if (showsRes.ok) {
          const showsData: ShowsSearchResponse | any[] = await showsRes.json();
          const showsRaw = Array.isArray(showsData)
            ? showsData
            : (showsData.results ?? []);

          const shows: MovieResult[] = showsRaw
            .filter((show: any) => show.first_air_date && show.vote_average !== 0)
            .slice(0, 20)
            .map((show: any) => ({
              id: show.id,
              title: show.name,
              type: "tv" as const,
              poster_path: show.poster_path,
            }));
          allResults.push(...shows);
        }

        // Drop exact duplicates (same type + id)
        const unique = Array.from(
          new Map(allResults.map((item) => [`${item.type}:${item.id}`, item])).values()
        );

        // Smart rank (normalize + token + fuzzy) so typos like "housmaid" match "housemaid".
        const ranked = rankByQuery(unique, normalizedQuery, (r) => [r.title]);
        const finalResults = ranked.slice(0, 10);

        if (requestId === searchRequestIdRef.current) {
          setFilteredMovies(finalResults);
        }
      } catch (error) {
        console.error("Error searching movies/shows:", error);
        if (requestId === searchRequestIdRef.current) {
          setFilteredMovies([]);
        }
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setLoadingMovies(false);
        }
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [movieSearch]);

  const submitReview = async () => {
    if (!selectedMovie || rating === "") return

    setSubmitting(true)
    try {
      const basePath = selectedMovie.type === "tv" 
        ? `/api/shows/${selectedMovie.id}`
        : `/api/movies/${selectedMovie.id}`
      
      const hasContent = text.trim()
      const endpoint = hasContent ? `${basePath}/post` : `${basePath}/rate`
      const ratingNum = Number.parseInt(rating, 10)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasContent ? {
          rating: ratingNum,
          title: selectedMovie.title,
          post_text: text.trim(),
        } : { rating: ratingNum }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to post review")
      }

      // Reset form
      setSelectedMovie(null)
      setMovieSearch("")
      setRating("")
      setText("")
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error posting review.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRatingChange = (value: string) => {
    if (value === "") {
      setRating("")
      return
    }
    const num = Number.parseInt(value, 10)
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setRating(value)
    }
  }

  const ratingNum = Number.parseInt(rating, 10) || 0

  return (
    <div className="relative w-full">
      {/* Main Card */}
      <div className="bg-zinc-900/80 backdrop-blur border border-fuchsia-500/20 rounded-xl p-4 sm:p-5 shadow-lg shadow-fuchsia-500/5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} className="text-fuchsia-400 flex-shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold text-zinc-100">Share Your Review</h3>
        </div>

      <div className="space-y-3">
        {/* Top Row - Movie Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Movie or Show
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />

              {/* Dropdown */}
              {movieSearch && (loadingMovies || filteredMovies.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {loadingMovies ? (
                    <div className="px-3 py-2 text-gray-400 text-xs">Searching...</div>
                  ) : filteredMovies.length > 0 ? (
                    filteredMovies.map((movie) => (
                      <button
                        key={`${movie.type}-${movie.id}`}
                        onClick={() => {
                          setSelectedMovie(movie)
                          setMovieSearch(movie.title)
                          setFilteredMovies([])
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-fuchsia-500/10 transition-colors text-left"
                      >
                        <div className="w-8 h-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700/50">
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt=""
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Film size={12} className="text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-zinc-100 truncate font-medium">{movie.title}</p>
                          <span
                            className={`text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold ${movie.type === "tv" ? "text-violet-400" : "text-fuchsia-400"}`}
                          >
                            {movie.type === "tv" ? "Series" : "Movie"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Movie */}
          {selectedMovie && (
            <div className="flex items-center justify-between bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                {selectedMovie.type === "tv" ? (
                  <Tv size={14} className="text-violet-400 flex-shrink-0" />
                ) : (
                  <Film size={14} className="text-fuchsia-400 flex-shrink-0" />
                )}
                <span className="text-xs sm:text-sm text-zinc-100 truncate">{selectedMovie.title}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedMovie(null)
                  setMovieSearch("")
                }}
                className="text-zinc-400 hover:text-zinc-100 transition-colors ml-2"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide font-medium">Rating:</span>
            <input
              type="text"
              inputMode="numeric"
              value={rating}
              onChange={(e) => handleRatingChange(e.target.value)}
              placeholder="?"
              className="w-10 sm:w-12 h-7 sm:h-8 text-center text-sm sm:text-base font-bold rounded-lg bg-zinc-800 border border-zinc-700/50 text-fuchsia-400 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            <span className="text-xs sm:text-sm font-medium">/10</span>
          </div>

          {/* Review Text */}
          {selectedMovie && ratingNum > 0 && (
            <textarea
              placeholder="Share your thoughts (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all resize-none h-20 sm:h-24"
            />
          )}

          {/* Submit Button */}
          <button
            onClick={submitReview}
            disabled={submitting || !selectedMovie || ratingNum === 0}
            className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 text-white font-semibold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Star size={14} className={ratingNum > 0 ? "fill-current" : ""} />
                Post Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

