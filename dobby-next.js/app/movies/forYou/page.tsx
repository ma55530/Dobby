"use client";

import { useEffect, useState } from "react";
import { Movie } from "@/lib/types/Movie";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MoviesForYouPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dodaj state za "Read more"
  const [showFullOverview, setShowFullOverview] = useState(false);

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <h1 className="text-5xl font-bold mb-10">Dobby thinks you'll like...</h1>

      <div className="relative w-full max-w-5xl flex items-center justify-center">
        {/* left arrow */}
        <button
          onClick={prevMovie}
          className="absolute -left-10 p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* movie card */}
        <div className="flex flex-col md:flex-row items-center md:items-stretch bg-gray-900/60 backdrop-blur rounded-2xl shadow-2xl overflow-hidden w-full mx-8">
          {/* poster */}
          <div className="flex-shrink-0">
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              className="w-full md:w-[280px] h-auto object-cover md:rounded-l-2xl"
            />
          </div>

          {/* movie info */}
          <div className="flex flex-col justify-between p-6 md:p-8 w-full">
            <div>
              <h2 className="text-3xl font-semibold mb-2">{movie.title}</h2>
              <p className="text-gray-400 text-base md:text-lg mb-1">{movie.release_date}</p>
              <p className="text-yellow-400 text-lg md:text-xl font-semibold mb-4">
                ⭐ {movie.vote_average?.toFixed(1)}
              </p>
              <p className={`text-gray-200 text-base md:text-lg leading-relaxed ${showFullOverview ? "" : "max-h-32 overflow-hidden"}`}>
                {movie.overview || (
                  <span className="italic text-gray-500">No description available.</span>
                )}
              </p>
              {movie.overview && movie.overview.length > 250 && (
                <button
                  className="text-blue-400 hover:underline text-sm mt-1"
                  onClick={() => setShowFullOverview((v) => !v)}
                >
                  {showFullOverview ? "Show less" : "Read more"}
                </button>
              )}
              <p className="text-gray-400 text-sm md:text-base mt-4">
                Genres: {movie.genres?.map(genre => genre.name).join(", ") || "N/A"}
              </p>
              <p className="text-gray-400 text-sm md:text-base mt-4">
                Duration: {movie.runtime ? `${movie.runtime} minutes` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* right arrow */}
        <button
          onClick={nextMovie}
          className="absolute -right-10 p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition"
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
