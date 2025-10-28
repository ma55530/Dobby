"use client";

import { useState } from "react";
import TrackCard from "@/components/tracks/TrackCard";
import { Movie } from "@/lib/types/Movie";
import { Movies } from "@/lib/types/Movies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MovieWithDetails extends Movies {
  details?: Movie;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieWithDetails[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchMovieDetails = async (movie: Movies): Promise<MovieWithDetails> => {
    const res = await fetch(`/api/movies/${movie.id}`);
    const details = await res.json();
    return { ...movie, details };
  };

  const handleSearch = async (searchQuery: string, searchPage: number) => {
    if (!searchQuery) return;
    setLoading(true);
    const res = await fetch(`/api/movies?query=${searchQuery}&page=${searchPage}`);
    const movies: Movies[] = await res.json();
    const moviesWithDetails = await Promise.all(movies.map(fetchMovieDetails));

    const filteredMovies = moviesWithDetails.filter(
      (movie) =>
        movie.release_date &&
        movie.poster_path &&
        movie.details &&
        movie.details.runtime &&
        movie.vote_average != 0
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
    <div className="p-4 mx-25">
      <div className="flex w-full max-w-sm items-center space-x-2 mb-4 mx-auto">
        <Input
          type="text"
          placeholder="Search for a movie..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <Button type="submit" onClick={onSearch}>Search</Button>
      </div>
      <div className="flex flex-wrap justify-start gap-6">
        {results.map((movie) => (
          movie.details && (
          <TrackCard
            id={movie.id}
            key={movie.id}
            title={movie.title}
            poster={movie.poster_path}
            rating={movie.vote_average}
            year={movie.release_date}
            infoAboutTrack={`${movie.details.runtime}m` }
            onClick={function(): void {
              throw new Error("Function not implemented.");
            }} />
          )
        ))}
      </div>
      {results.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button onClick={onShowMore} disabled={loading}>
            {loading ? "Loading..." : "Show More"}
          </Button>
        </div>
      )}
    </div>
  );
}
