"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Show } from "@/lib/types/Show";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Image from "next/image";

export default function ShowsForYouPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dodaj state za "Read more"
  const [showFullOverview, setShowFullOverview] = useState(false);

  const phrases = [
    "Dobby thinks Master will binge these!",
    "Dobby stayed up watching these!",
    "Your next favorite show awaits!",
    "Your watchlist just got better.",
    "One episode… and you’re hooked!",
    "Trust Dobby — these ones deliver.",
    "One episode won’t be enough",
    "Something special just for you.",
    "You’re gonna love this vibe ...",
    "Dobby has given master ...",
    "Dobby handpicked these for Master ...",
  ];

  const [phrase, setPhrase] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchShows = async (retry = true) => {
    try {
      const res = await fetch("/api/shows/forYou?limit=20");
      if (!res.ok) throw new Error("Failed to fetch shows");
      const data = await res.json();

      if (data.length === 0 && retry) {
        setIsGenerating(true);
        const genRes = await fetch("/api/recommendation-engine?limit=20");
        if (genRes.ok) {
          await fetchShows(false);
        }
        setIsGenerating(false);
      } else {
        setShows(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRerun = async () => {
    setIsGenerating(true);
    // Don't set full page loading, just button state
    try {
      await fetch("/api/recommendation-engine?limit=20");
      await fetchShows(false);
    } catch (e) {
      console.error("Rerun failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Resetiraj "Read more" kad se promijeni film
  useEffect(() => {
    setShowFullOverview(false);
  }, [index]);

  const toggleOverview = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFullOverview((v) => !v);
  };

  const nextShow = () => setIndex((prev) => (prev + 1) % shows.length);
  const prevShow = () => setIndex((prev) => (prev - 1 + shows.length) % shows.length);

  if (loading || (isGenerating && shows.length === 0))
    return <div className="text-gray-400 text-center p-8">{isGenerating ? "Curating your personal recommendations..." : "Loading your shows..."}</div>;

  if (shows.length === 0)
    return <div className="text-gray-400 text-center p-8">No recommendations yet.</div>;

  const show = shows[index];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-white p-6">
      <h1 className="text-5xl font-bold mb-10">{phrase}</h1>

      <div className="relative w-full max-w-6xl flex items-center justify-center">
        {/* Left arrow */}
        <button
          onClick={prevShow}
          className="absolute -left-12 p-4 bg-black border border-purple-500 text-purple-400 hover:text-white hover:bg-purple-600 hover:shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* show card */}
        <Link href={`/shows/${show.id}`} className="w-full mx-8">
          <div className="flex flex-col md:flex-row items-center md:items-stretch bg-gray-900/60 backdrop-blur rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-purple-500/40 overflow-hidden w-full transition-shadow hover:shadow-[0_0_50px_rgba(0,0,0,1)] cursor-pointer">
            {/* Poster */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <Image
                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                alt={show.name}
                width={400}
                height={600}
                className="w-full h-full object-cover md:rounded-l-2xl"
                priority
              />
            </div>

            {/* show info */}
            <div className="flex flex-col justify-between p-6 md:p-8 w-full md:w-2/3 lg:w-3/4">
              <div>
                <h2 className="text-2xl md:text-4xl font-semibold mb-2">{show.name}</h2>
                <p className="text-gray-400 text-sm md:text-base mb-1">First aired: {show.first_air_date}</p>
                <p className="text-yellow-400 text-base md:text-lg font-semibold mb-4">
                  ⭐ {show.vote_average?.toFixed(1)}
                </p>
                <p
                  className={`text-gray-200 text-sm md:text-xl leading-relaxed ${showFullOverview ? "" : "max-h-32 overflow-hidden"
                    }`}
                >
                  {show.overview || (
                    <span className="italic text-gray-500">No description available.</span>
                  )}
                </p>
                {show.overview && show.overview.length > 250 && (
                  <button
                    className="text-purple-400 hover:underline text-sm mt-1"
                    onClick={toggleOverview}
                  >
                    {showFullOverview ? "Show less" : "Read more"}
                  </button>
                )}
                <p className="text-gray-400 text-sm md:text-base mt-4">
                  Genres: {show.genres?.map((genre) => genre.name).join(", ") || "N/A"}
                </p>
                <p className="text-gray-400 text-sm md:text-base mt-2">
                  Seasons: {show.number_of_seasons ?? "N/A"} &nbsp;|&nbsp; Episodes: {show.number_of_episodes ?? "N/A"}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Right arrow */}
        <button
          onClick={nextShow}
          className="absolute -right-12 p-4 bg-black border border-purple-500 text-purple-400 hover:text-white hover:bg-purple-600 hover:shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all rounded-full"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="mt-6 text-gray-400">
        {index + 1} / {shows.length}
      </div>

      <div className="mt-12 flex flex-col items-center gap-2">
        <button
          onClick={handleRerun}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Curating..." : "Rerun DobbySense"}
        </button>
        {isGenerating && (
          <p className="text-xs text-gray-600">
            This could take a few seconds.
          </p>
        )}
      </div>
    </div>
  );
}
