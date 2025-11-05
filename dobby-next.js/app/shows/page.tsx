"use client";

import { useEffect, useState } from "react";
import TrackCard from "@/components/tracks/TrackCard";
import { Shows } from "@/lib/types/Shows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  
  useEffect(() => {
    const saved = localStorage.getItem('recentShowSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const addToRecentSearches = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const newSearches = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5); 
    
    setRecentSearches(newSearches);
    localStorage.setItem('recentShowSearches', JSON.stringify(newSearches));
  };

  const [popular, setPopular] = useState<Shows[]>([]);
  const [upcoming, setUpcoming] = useState<Shows[]>([]);
  const [trending, setTrending] = useState<Shows[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);


  useEffect(() => {
    if (query) return;
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
  }, [query]);

  const handleSearch = async (searchQuery: string, searchPage: number) => {
    if (!searchQuery) return;
    setLoading(true);
    const res = await fetch(`/api/shows?query=${searchQuery}&page=${searchPage}`);
    const shows: Shows[] = await res.json();

    const filteredShows = shows.filter(
      (show) =>
        show.first_air_date &&
        show.poster_path &&
        show.vote_average !== 0
    );

    if (searchPage === 1) {
      setResults(filteredShows);
    } else {
      setResults((prev) => [...prev, ...filteredShows]);
    }
    setLoading(false);
  };

  const onSearch = () => {
    if (!query.trim()) return;
    setPage(1);
    addToRecentSearches(query);
    handleSearch(query, 1);
  };

  const onShowMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    handleSearch(query, newPage);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm mx-auto mb-8">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search for a TV show..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]); 
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
          <Button type="submit" onClick={onSearch}>Search</Button>
        </div>
        
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mt-2">
            <div className="text-sm text-gray-400 mb-1">Recent searches:</div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    handleSearch(search, 1);
                  }}
                  className="text-sm px-3 py-1 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {query ? (
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
              onClick={function (): void {
                throw new Error("Function not implemented.");
              }}
            />
          ))}
          {results.length === 0 && !loading && (
            <div className="text-gray-400 text-center w-full">No results found.</div>
          )}
          {results.length > 0 && (
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
            <h2 className="text-2xl font-bold mb-4 text-white">Popular TV Shows</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {popular
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((show) => (
                  <TrackCard
                    id={show.id}
                    key={show.id}
                    title={show.name}
                    poster={show.poster_path}
                    rating={show.vote_average}
                    year={show.first_air_date}
                    infoAboutTrack={""}
                    onClick={function (): void {
                      throw new Error("Function not implemented.");
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          {/* Upcoming */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Upcoming TV Shows</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {upcoming
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((show) => (
                  <TrackCard
                    id={show.id}
                    key={show.id}
                    title={show.name}
                    poster={show.poster_path}
                    rating={show.vote_average}
                    year={show.first_air_date}
                    infoAboutTrack={""}
                    onClick={function (): void {
                      throw new Error("Function not implemented.");
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          {/* Trending */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Trending TV Shows</h2>
            {loadingDefault ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {trending
                  .sort((a, b) => b.vote_average - a.vote_average)
                  .slice(0, 5)
                  .map((show) => (
                  <TrackCard
                    id={show.id}
                    key={show.id}
                    title={show.name}
                    poster={show.poster_path}
                    rating={show.vote_average}
                    year={show.first_air_date}
                    infoAboutTrack={""}
                    onClick={function (): void {
                      throw new Error("Function not implemented.");
                    }}
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
