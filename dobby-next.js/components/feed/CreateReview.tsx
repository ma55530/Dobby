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
    if (!selectedMovie || rating === 0) {
      return alert("Movie and rating are required!");
    }

    setSubmitting(true);
    try {
      // Determine endpoint based on content type
      const endpoint = selectedMovie.type === "tv" 
        ? `/api/shows/${selectedMovie.id}/reviews`
        : `/api/movies/${selectedMovie.id}/reviews`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          review_title: selectedMovie.title,
          review: text.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post review");
      }

      // Success! Reset form
      alert("Review posted successfully!");
      setRating(0);
      setText("");
      setSelectedMovie(null);
      setMovieSearch("");

      // Refresh the feed by reloading the page or dispatching an event
      window.location.reload();
    } catch (error) {
      console.error("Error posting review:", error);
      alert(
        error instanceof Error ? error.message : "Failed to post review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-700/50 rounded-lg p-4 mb-8">
      <h3 className="text-lg font-bold text-white mb-3">Share Your Review</h3>

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
                        key={movie.id}
                        onClick={() => {
                          setSelectedMovie(movie);
                          setMovieSearch(movie.title);
                          setFilteredMovies([]);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-white border-b border-zinc-800 last:border-b-0 transition-colors text-xs"
                      >
                        <span>{movie.title}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {movie.type === "tv" ? "TV Show" : "Movie"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-400 text-xs">No results found</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Deselect Button */}
            {selectedMovie && (
              <button
                onClick={() => {
                  setSelectedMovie(null);
                  setMovieSearch("");
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-gray-300 font-semibold transition-colors whitespace-nowrap"
              >
                Deselect
              </button>
            )}
          </div>

          {selectedMovie && (
            <p className="text-xs text-purple-400 mt-1">
              Selected: <span className="font-semibold">{selectedMovie.title}</span>
            </p>
          )}
        </div>

        {/* Rating Scale */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Rating
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
            {rating > 0 && (
              <span className="text-sm font-bold text-yellow-400 whitespace-nowrap">{rating}/10</span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={submitReview}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-1.5 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 text-sm"
        >
          {submitting ? "Posting..." : "Post Review"}
        </button>
      </div>

      {/* Review Text - Optional, expanded below */}
      {selectedMovie && rating > 0 && (
        <div className="mt-3">
          <textarea
            placeholder="Add your thoughts... (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none text-sm"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

