"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Movie } from "@/lib/types/Movie";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

export default function MoviesForYouPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dodaj state za "Read more"
  const [showFullOverview, setShowFullOverview] = useState(false);

  const phrases = [
    "Dobby thinks you'll like...",
    "These have got magic written all over them!",
    "Your next favorite movie awaits!",
    "Dobby recommends this masterpiece!",
    "A cinematic gem just for you!",
    "The elves whisper good things about these ones...",
    "Your movie destiny lies here!",
    "Dobby promises you'll love this!",
    "A film as unique as you are!",
    "Get ready for a magical movie night!",
    "Dobby has given master ...",
  ];

  const [phrase, setPhrase] = useState<string>("");

  useEffect(() => {
    setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch("/api/movies/forYou?limit=20");
        if (!res.ok) throw new Error("Failed to fetch movies");
        const data = await res.json();
        setMovies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Resetiraj "Read more" kad se promijeni film
  useEffect(() => {
    setShowFullOverview(false);
  }, [index]);

  const nextMovie = () => setIndex((prev) => (prev + 1) % movies.length);
  const prevMovie = () => setIndex((prev) => (prev - 1 + movies.length) % movies.length);

  if (loading)
    return <div className="text-gray-400 text-center p-8">Loading your movies...</div>;

  if (movies.length === 0)
    return <div className="text-gray-400 text-center p-8">No recommendations yet.</div>;

  const movie = movies[index];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-white p-6">
      <h1 className="text-5xl font-bold mb-10">{phrase}</h1>

      <div className="relative w-full max-w-6xl flex items-center justify-center">
  {/* Left arrow */}
  <button
  onClick={prevMovie}
  className="absolute -left-12 p-4 bg-black border border-purple-500 text-purple-400 hover:text-white hover:bg-purple-600 hover:shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all rounded-full"
>
  <ChevronLeft className="w-6 h-6" />
</button>

  {/* Movie card */}
  <Link href={`/movies/${movie.id}`} className="w-full mx-8">
    <div className="flex flex-col md:flex-row items-center md:items-stretch bg-gray-900/60 backdrop-blur rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-purple-500/40 overflow-hidden w-full transition-shadow hover:shadow-[0_0_50px_rgba(0,0,0,1)] cursor-pointer">
    {/* Poster */}
    <div className="w-full md:w-1/3 lg:w-1/4">
      <Image
      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
      alt={movie.title}
      width={400}
      height={600}
      className="w-full h-full object-cover md:rounded-l-2xl"
      priority
      />
    </div>

    {/* Movie info */}
    <div className="flex flex-col justify-between p-6 md:p-8 w-full md:w-2/3 lg:w-3/4">
      <div>
        <h2 className="text-2xl md:text-4xl font-semibold mb-2">{movie.title}</h2>
        <p className="text-gray-400 text-sm md:text-base mb-1">{movie.release_date}</p>
        <p className="text-yellow-400 text-base md:text-lg font-semibold mb-4">
          ⭐ {movie.vote_average?.toFixed(1)}
        </p>
        <p
          className={`text-gray-200 text-sm md:text-xl leading-relaxed ${
            showFullOverview ? "" : "max-h-32 overflow-hidden"
          }`}
        >
          {movie.overview || (
            <span className="italic text-gray-500">No description available.</span>
          )}
        </p>
        {movie.overview && movie.overview.length > 250 && (
          <button
            className="text-purple-400 hover:underline text-sm mt-1"
            onClick={() => setShowFullOverview((v) => !v)}
          >
            {showFullOverview ? "Show less" : "Read more"}
          </button>
        )}
        <p className="text-gray-400 text-sm md:text-base mt-4">
          Genres: {movie.genres?.map((genre) => genre.name).join(", ") || "N/A"}
        </p>
        <p className="text-gray-400 text-sm md:text-base mt-2">
          Duration: {movie.runtime ? `${movie.runtime} minutes` : "N/A"}
        </p>
      </div>
    </div>
  </div>
  </Link>

  {/* Right arrow */}
  <button
  onClick={nextMovie}
  className="absolute -right-12 p-4 bg-black border border-purple-500 text-purple-400 hover:text-white hover:bg-purple-600 hover:shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all rounded-full"
>
  <ChevronRight className="w-6 h-6" />
</button>
</div>

      <div className="mt-6 text-gray-400">
        {index + 1} / {movies.length}
      </div>
    </div>
  );
}
