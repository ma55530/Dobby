"use client";

import { useEffect, useState } from "react";
import Fuse from "fuse.js";
import TrackCard from "@/components/tracks/TrackCard";
import { Movies } from "@/lib/types/Movies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MoviesSearchResponse = {
  results: Movies[];
  page: number;
  total_pages: number;
  total_results: number;
};

async function fetchMovieCategory(endpoint: string): Promise<Movies[]> {
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const data = await res.json();
  return data;
}

export default function MoviesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movies[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false); 

  const [popular, setPopular] = useState<Movies[]>([]);
  const [upcoming, setUpcoming] = useState<Movies[]>([]);
  const [trending, setTrending] = useState<Movies[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  
  useEffect(() => {
    setLoadingDefault(true);
    Promise.all([
      fetchMovieCategory("/api/movies/popular"),
      fetchMovieCategory("/api/movies/upcoming"),
      fetchMovieCategory("/api/movies/trending"),
    ])
      .then(([popularData, upcomingData, trendingData]) => {
        setPopular(popularData);
        setUpcoming(upcomingData);
        setTrending(trendingData);
      })
      .finally(() => setLoadingDefault(false));
  }, []);

  const addToRecentSearches = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const newSearches = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);
    setRecentSearches(newSearches);
    localStorage.setItem("recentSearches", JSON.stringify(newSearches));
  };

  const handleSearch = async (searchQuery: string, searchPage: number) => {
    if (!searchQuery) return;
    setLoading(true);
    const res = await fetch(`/api/movies?query=${searchQuery}&page=${searchPage}`);
    if (!res.ok) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const data: MoviesSearchResponse = await res.json();

    let filteredMovies = data.results.filter(
      (movie) => movie.release_date && movie.vote_average !== 0
    );

    // Apply fuzzy search for better matching
    const fuse = new Fuse(filteredMovies, {
      keys: ["title"],
      threshold: 0.3, // Lower = stricter matching
    });

    const fuzzyResults = fuse.search(searchQuery).map((result) => result.item);

    // Use fuzzy results if found, otherwise use filtered results
    filteredMovies = fuzzyResults.length > 0 ? fuzzyResults : filteredMovies;

    setResults((prev) => {
  const combined =
    searchPage === 1 ? filteredMovies : [...prev, ...filteredMovies];

  return Array.from(
    new Map(combined.map((movie) => [movie.id, movie])).values()
  );
});


    const moreAvailable = searchPage < data.total_pages && filteredMovies.length > 0;
    setHasMore(moreAvailable);
    setLoading(false);
  };

  const onSearch = () => {
    if (!query.trim()) return;
    setPage(1);
    setHasMore(true);
    addToRecentSearches(query);
    handleSearch(query, 1);
    setIsFocused(false); 
  };

  const onShowMore = () => {
    if (!hasMore || loading) return;
    const newPage = page + 1;
    setPage(newPage);
    handleSearch(query, newPage);
  };

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-4 pt-10 gap-10"
      onClick={() => setIsFocused(false)} 
    >
      <div
        className="w-full max-w-sm mx-auto mb-8 relative"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex items-center space-x-2 relative">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search for a movie..."
              value={query}
              onFocus={() => setIsFocused(true)} 
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            )}
          </div>
          <Button
            type="submit"
            onClick={onSearch}
            className="bg-purple-800 text-gray-300 hover:bg-purple-800/60"
          >
            Search
          </Button>
        </div>

        {/* Recent Searches*/}
        {isFocused && recentSearches.length > 0 && (
          <div className="absolute w-76 mt-2 bg-gray-300/80 p-3 rounded-xl shadow-lg z-10 animate-fadeIn">
            {/*<div className="flex text-sm  text-gray-700 mb-1">Recent searches:</div>*/}
            <div className="flex flex-col gap-1 items-start text-left">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    handleSearch(search, 1);
                    setIsFocused(false);
                  }}
                  className="text-sm px-3 py-1  text-gray-700 hover:text-purple-800 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {query && results.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl">
          {results.map((movie) => (
            <TrackCard
              id={movie.id}
              key={movie.id}
              title={movie.title}
              poster={movie.poster_path}
              rating={movie.vote_average}
              year={movie.release_date}
              infoAboutTrack={""}
              href={`/movies/${movie.id}`}
            />
          ))}
          {results.length > 0 && hasMore && (
            <div className="flex justify-center mt-4 w-full">
              <Button onClick={onShowMore} disabled={loading}>
                {loading ? "Loading..." : "Show More"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-12 w-full max-w-6xl">
          {/* Popular */}
          <section>
            <h2 className="text-2xl font-sans mb-4 text-white">Popular Movies</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {popular
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((movie) => (
                    <TrackCard
                      id={movie.id}
                      key={movie.id}
                      title={movie.title}
                      poster={movie.poster_path}
                      rating={movie.vote_average}
                      year={movie.release_date}
                      infoAboutTrack={""}
                      href={`/movies/${movie.id}`}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Upcoming */}
          <section>
            <h2 className="text-2xl font-sans mb-4 text-white">Upcoming Movies</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {upcoming
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((movie) => (
                    <TrackCard
                      id={movie.id}
                      key={movie.id}
                      title={movie.title}
                      poster={movie.poster_path}
                      rating={movie.vote_average}
                      year={movie.release_date}
                      infoAboutTrack={""}
                      href={`/movies/${movie.id}`}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Trending */}
          <section>
            <h2 className="text-2xl font-sans mb-4 text-white">Trending Movies</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {trending
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((movie) => (
                    <TrackCard
                      id={movie.id}
                      key={movie.id}
                      title={movie.title}
                      poster={movie.poster_path}
                      rating={movie.vote_average}
                      year={movie.release_date}
                      infoAboutTrack={""}
                      href={`/movies/${movie.id}`}
                    />
                  ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
