"use client";

import { useEffect, useState } from "react";
import TrackCard from "@/components/tracks/TrackCard";
import { Shows } from "@/lib/types/Shows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { rankByQuery } from "@/lib/search/smartSearch";

type ShowsSearchResponse = {
  results: Shows[];
  page: number;
  total_pages: number;
  total_results: number;
};

async function fetchShowCategory(endpoint: string): Promise<Shows[]> {
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const data = await res.json();
  return data;
}

export default function ShowsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Shows[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false); 

  const [popular, setPopular] = useState<Shows[]>([]);
  const [upcoming, setUpcoming] = useState<Shows[]>([]);
  const [trending, setTrending] = useState<Shows[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentShowSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // Fetch default categories
  useEffect(() => {
    setLoadingDefault(true);
    Promise.all([
      fetchShowCategory("/api/shows/popular"),
      fetchShowCategory("/api/shows/upcoming"),
      fetchShowCategory("/api/shows/trending"),
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
      searchQuery.trim().replace(/\s+/g, " "),
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5);

    setRecentSearches(newSearches);
    localStorage.setItem('recentShowSearches', JSON.stringify(newSearches));
  };

  const handleSearch = async (searchQuery: string, searchPage: number) => {
    const normalizedQuery = searchQuery.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) return;
    setLoading(true);
    const res = await fetch(
      `/api/shows?query=${encodeURIComponent(normalizedQuery)}&page=${searchPage}`
    );
    if (!res.ok) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const data: ShowsSearchResponse | Shows[] = await res.json();
    const shows: Shows[] = Array.isArray(data) ? data : data.results;

    let filteredShows = shows.filter(
      (show) =>
        show.first_air_date &&
        show.vote_average !== 0
    );

    // Rank (normalize + token + fuzzy) instead of filtering out candidates.
    filteredShows = rankByQuery(filteredShows, normalizedQuery, (s: Shows) => [s.name, (s as unknown as Record<string, unknown>).original_name as string]);

    setResults((prev) => {
  const combined =
    searchPage === 1 ? filteredShows : [...prev, ...filteredShows];

  return Array.from(
    new Map(combined.map((show) => [show.id, show])).values()
  );
});

    const moreAvailable =
      !Array.isArray(data) &&
      searchPage < data.total_pages &&
      filteredShows.length > 0;
    setHasMore(moreAvailable);

    setLoading(false);
  };

  const onSearch = () => {
    if (!query.trim()) return;
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    setPage(1);
    setHasMore(true);
    addToRecentSearches(normalizedQuery);
    handleSearch(normalizedQuery, 1);
    setIsFocused(false);
  };

  const onShowMore = () => {
    if (!hasMore || loading) return;
    const newPage = page + 1;
    setPage(newPage);
    handleSearch(query, newPage);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" onClick={() => setIsFocused(false)}>
      <div className="w-full max-w-sm mx-auto mb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search for a TV show..."
              value={query}
              onFocus={() => setIsFocused(true)} 
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]); // clear search results while typing
              }}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            )}
          </div>
          <Button type="submit" onClick={onSearch} 
          className="bg-purple-800 text-gray-300 hover:bg-purple-800/60"
            >Search</Button>
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

      {/* Show results if search query exists, otherwise show default categories */}
      {query && results.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl">
          {results.map((show) => (
            <TrackCard
              id={show.id}
              key={show.id}
              title={show.name}
              poster={show.poster_path}
              rating={show.vote_average}
              year={show.first_air_date}
              infoAboutTrack={""}
              href={`/shows/${show.id}`}
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
            <h2 className="text-2xl font-sans mb-4 text-white">Popular TV Shows</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {popular
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((show) => (
                    <div key={show.id} className="flex-none snap-start">
                      <TrackCard
                        id={show.id}
                        title={show.name}
                        poster={show.poster_path}
                        rating={show.vote_average}
                        year={show.first_air_date}
                        infoAboutTrack={""}
                        href={`/shows/${show.id}`}
                      />
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Upcoming */}
          <section>
            <h2 className="text-2xl font-sans mb-4 text-white">Upcoming TV Shows</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {upcoming
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((show) => (
                    <div key={show.id} className="flex-none snap-start">
                      <TrackCard
                        id={show.id}
                        title={show.name}
                        poster={show.poster_path}
                        rating={show.vote_average}
                        year={show.first_air_date}
                        infoAboutTrack={""}
                        href={`/shows/${show.id}`}
                      />
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Trending */}
          <section>
            <h2 className="text-2xl font-sans mb-4 text-white">Trending TV Shows</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {trending
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((show) => (
                    <div key={show.id} className="flex-none snap-start">
                      <TrackCard
                        id={show.id}
                        title={show.name}
                        poster={show.poster_path}
                        rating={show.vote_average}
                        year={show.first_air_date}
                        infoAboutTrack={""}
                        href={`/shows/${show.id}`}
                      />
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
