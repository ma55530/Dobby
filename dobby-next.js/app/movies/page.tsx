"use client";

import { useEffect, useState } from "react";
import TrackCard from "@/components/tracks/TrackCard";
import { Movies } from "@/lib/types/Movies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Helper function to fetch a movie category
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

  // State for default categories
  const [popular, setPopular] = useState<Movies[]>([]);
  const [upcoming, setUpcoming] = useState<Movies[]>([]);
  const [trending, setTrending] = useState<Movies[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);

  useEffect(() => {
    if (query) return;
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
  }, [query]);

  const handleSearch = async (searchQuery: string, searchPage: number) => {
    if (!searchQuery) return;
    setLoading(true);
    const res = await fetch(`/api/movies?query=${searchQuery}&page=${searchPage}`);
    const movies: Movies[] = await res.json();

    const filteredMovies = movies.filter(
      (movie) =>
        movie.release_date &&
        movie.poster_path &&
        movie.vote_average !== 0
    );

    if (searchPage === 1) {
      setResults(filteredMovies);
    } else {
      setResults((prev) => [...prev, ...filteredMovies]);
    }
    setLoading(false);
  };

  const onSearch = () => {
    setPage(1);
    handleSearch(query, 1);
  };

  const onShowMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    handleSearch(query, newPage);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex w-full max-w-sm items-center space-x-2 mb-8 mx-auto">
        <Input
          type="text"
          placeholder="Search for a movie..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]); // clear results when typing
          }}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <Button type="submit" onClick={onSearch}>Search</Button>
      </div>

      {query ? (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl">
          {results.map((movie) => (
            <TrackCard
              id={movie.id}
              key={movie.id}
              title={movie.title}
              poster={movie.poster_path}
              rating={
                movie.vote_average
              }
              year={movie.release_date}
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
            <h2 className="text-2xl font-bold mb-4 text-white">Popular Movies</h2>
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
            <h2 className="text-2xl font-bold mb-4 text-white">Upcoming Movies</h2>
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
            <h2 className="text-2xl font-bold mb-4 text-white">Trending Movies</h2>
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
