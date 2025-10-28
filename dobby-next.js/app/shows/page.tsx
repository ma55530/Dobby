"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TrackCard from "@/components/tracks/TrackCard";
import { Show } from "@/lib/types/Show";
import { Shows } from "@/lib/types/Shows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ShowWithDetails extends Shows {
  details?: Show;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShowWithDetails[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const router = useRouter();


  const fetchShowDetails = async (show: Shows): Promise<ShowWithDetails> => {
    const res = await fetch(`/api/shows/${show.id}`);
    const details = await res.json();
    return { ...show, details };
  };

  const handleSearch = async (searchQuery: string, searchPage: number) => {
    if (!searchQuery) return;
    setLoading(true);
    const res = await fetch(`/api/shows?query=${searchQuery}&page=${searchPage}`);
    const shows: Shows[] = await res.json();
    const showsWithDetails = await Promise.all(shows.map(fetchShowDetails));

    const filteredShows = showsWithDetails.filter(
      (show) =>
        show.first_air_date &&
        show.poster_path &&
        show.details &&
        show.details.number_of_seasons &&
        show.vote_average != 0
    );

    if (searchPage === 1) {
      setResults(filteredShows);
    } else {
      setResults((prev) => [...prev, ...filteredShows]);
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
          placeholder="Search for a show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <Button type="submit" onClick={onSearch}>Search</Button>
      </div>
      <div className="flex flex-wrap justify-start gap-6">
        {results.map((show) => (
          show.details && (
            <TrackCard
              id={show.id}
              key={show.id}
              title={show.original_name}
              poster={show.poster_path}
              rating={show.vote_average}
              year={show.first_air_date}
              infoAboutTrack={`${show.details.number_of_seasons} seasons`}
              onClick={() => router.push(`/shows/${show.id}`)}
            />
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
