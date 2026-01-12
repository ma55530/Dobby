"use client";

import { useEffect, useState } from "react";
import TrackCard from "@/components/tracks/TrackCard";
import { Movies } from "@/lib/types/Movies";

export default function TrendingMovies({ timeWindow = "day" }: { timeWindow?: "day" | "week" }) {
  const [trending, setTrending] = useState<Movies[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/trending?time_window=${timeWindow}`);
        if (!res.ok) {
          setTrending([]);
          return;
        }
        
        // Check if response is JSON before parsing
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          setTrending([]);
          return;
        }
        
        const data: Movies[] = await res.json();
        if (!mounted) return;
        setTrending(data || []);
      } catch (e) {
        console.error("Failed to fetch trending:", e);
        if (mounted) setTrending([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [timeWindow]);

  if (loading) return <div className="text-gray-400">Loading...</div>;

  if (!trending || trending.length === 0)
    return <div className="text-gray-400">No trending movies available.</div>;

  return (
    <div className="flex flex-wrap gap-6 justify-center">
      {trending
        .slice()
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
  );
}
