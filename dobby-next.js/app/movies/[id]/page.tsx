"use client";

import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState, use } from "react";
import { Movie } from "@/lib/types/Movie";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface MoviePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function MoviePage({ params }: MoviePageProps) {
  const { id } = use(params);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`/api/movies/${id}`);
        if (!res.ok) {
          setError("Movie not found");
          setLoading(false);
          return;
        }
        const data: Movie = await res.json();
        setMovie(data);
      } catch (err) {
        setError("Failed to load movie details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-red-500">{error || "Movie not found"}</p>
        <Link href="/movies">
          <Button variant="outline">Back to Movies</Button>
        </Link>
      </div>
    );
  }

  const backdropUrl = movie.backdrop_path ? getImageUrl(movie.backdrop_path) : null;
  const posterUrl = movie.poster_path ? getImageUrl(movie.poster_path) : "/assets/placeholder-movie.png";
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Backdrop */}
      {backdropUrl && (
        <div className="relative h-64 md:h-96 w-full overflow-hidden">
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="md:col-span-1 flex justify-center">
            <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title and Year */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{movie.title}</h1>
              {movie.original_title && movie.original_title !== movie.title && (
                <p className="text-gray-400 text-lg">{movie.original_title}</p>
              )}
            </div>

            {/* Rating and Release Date */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-yellow-500">★</span>
                <span className="text-2xl font-bold">{movie.vote_average.toFixed(1)}</span>
                <span className="text-gray-400">/ 10</span>
              </div>
              {movie.release_date && (
                <Badge variant="outline" className="text-base py-2 px-3">
                  {format(new Date(movie.release_date), "MMMM yyyy")}
                </Badge>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Runtime and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-400">Runtime</p>
                <p className="text-lg font-semibold">{runtime}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-400">Status</p>
                <p className="text-lg font-semibold">{movie.status}</p>
              </div>
            </div>

            
            
          </div>
        </div>

        {/* Overview */}
        {movie.overview && (
          <div className="mt-12 bg-slate-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed text-lg">{movie.overview}</p>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Production Companies */}
          {movie.production_companies && movie.production_companies.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Production Companies</h3>
              <div className="space-y-2">
                {movie.production_companies.map((company) => (
                  <p key={company.id} className="text-gray-300">
                    {company.name} {company.origin_country && `(${company.origin_country})`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Spoken Languages */}
          {movie.spoken_languages && movie.spoken_languages.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Languages</h3>
              <div className="space-y-2">
                {movie.spoken_languages.map((lang) => (
                  <p key={lang.iso_639_1} className="text-gray-300">
                    {lang.english_name}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-12">
          <Link href="/movies">
            <Button variant="outline">← Back to Movies</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
