"use client"

import { useState } from "react"
import { Search, Star, Film, Tv, X, Loader2 } from "lucide-react"

// Mock types for the component
interface Movie {
  id: number
  title: string
  type: "movie" | "tv"
  poster_path: string | null
}

export default function CreateReview() {
  const [movieSearch, setMovieSearch] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [rating, setRating] = useState("")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Search function with real API
  const handleMovieSearch = async (query: string) => {
    setMovieSearch(query)
    if (!query.trim()) {
      setFilteredMovies([])
      return
    }

    setLoadingMovies(true)
    try {
      const [moviesRes, showsRes] = await Promise.all([
        fetch(`/api/movies?query=${query}&page=1`),
        fetch(`/api/shows?query=${query}&page=1`),
      ])

      let allResults: Movie[] = []

      if (moviesRes.ok) {
        const moviesData: any = await moviesRes.json()
        const movies: Movie[] = moviesData.results
          .filter((movie: any) => movie.release_date && movie.vote_average !== 0)
          .slice(0, 4)
          .map((movie: any) => ({
            id: movie.id,
            title: movie.title,
            type: "movie" as const,
            poster_path: movie.poster_path,
          }))
        allResults.push(...movies)
      }

      if (showsRes.ok) {
        const showsData: any = await showsRes.json()
        const shows: Movie[] = showsData
          .filter((show: any) => show.first_air_date && show.vote_average !== 0)
          .slice(0, 4)
          .map((show: any) => ({
            id: show.id,
            title: show.name,
            type: "tv" as const,
            poster_path: show.poster_path,
          }))
        allResults.push(...shows)
      }

      setFilteredMovies(allResults)
    } catch (error) {
      console.error("Error searching movies/shows:", error)
      setFilteredMovies([])
    } finally {
      setLoadingMovies(false)
    }
  }

  const submitReview = async () => {
    if (!selectedMovie || rating === "") return

    setSubmitting(true)
    try {
      const basePath = selectedMovie.type === "tv" 
        ? `/api/shows/${selectedMovie.id}`
        : `/api/movies/${selectedMovie.id}`
      
      const hasContent = text.trim()
      const endpoint = hasContent ? `${basePath}/post` : `${basePath}/rate`
      const ratingNum = Number.parseInt(rating, 10)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasContent ? {
          rating: ratingNum,
          title: selectedMovie.title,
          post_text: text.trim(),
        } : { rating: ratingNum }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to post review")
      }

      // Reset form
      setSelectedMovie(null)
      setMovieSearch("")
      setRating("")
      setText("")
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error posting review.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRatingChange = (value: string) => {
    if (value === "") {
      setRating("")
      return
    }
    const num = Number.parseInt(value, 10)
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setRating(value)
    }
  }

  const ratingNum = Number.parseInt(rating, 10) || 0

  return (
    <div className="relative w-full">
      {/* Main Card */}
      <div className="bg-zinc-900/80 backdrop-blur border border-fuchsia-500/20 rounded-xl p-4 sm:p-5 shadow-lg shadow-fuchsia-500/5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} className="text-fuchsia-400 flex-shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold text-zinc-100">Share Your Review</h3>
        </div>

        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search movies or shows..."
              value={movieSearch}
              onChange={(e) => handleMovieSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            
            {/* Dropdown Results - positioned relative to search input */}
            {movieSearch && (loadingMovies || filteredMovies.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-sm border border-fuchsia-500/20 rounded-lg shadow-xl z-50 overflow-hidden">
                {loadingMovies ? (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <Loader2 size={16} className="animate-spin text-fuchsia-400" />
                    <span className="text-zinc-500 text-xs">Searching...</span>
                  </div>
                ) : (
                  <div className="max-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredMovies.map((movie) => (
                      <button
                        key={`${movie.type}-${movie.id}`}
                        onClick={() => {
                          setSelectedMovie(movie)
                          setMovieSearch(movie.title)
                          setFilteredMovies([])
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-fuchsia-500/10 transition-colors text-left"
                      >
                        <div className="w-8 h-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700/50">
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt=""
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Film size={12} className="text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-zinc-100 truncate font-medium">{movie.title}</p>
                          <span
                            className={`text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold ${movie.type === "tv" ? "text-violet-400" : "text-fuchsia-400"}`}
                          >
                            {movie.type === "tv" ? "Series" : "Movie"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Movie */}
          {selectedMovie && (
            <div className="flex items-center justify-between bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                {selectedMovie.type === "tv" ? (
                  <Tv size={14} className="text-violet-400 flex-shrink-0" />
                ) : (
                  <Film size={14} className="text-fuchsia-400 flex-shrink-0" />
                )}
                <span className="text-xs sm:text-sm text-zinc-100 truncate">{selectedMovie.title}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedMovie(null)
                  setMovieSearch("")
                }}
                className="text-zinc-400 hover:text-zinc-100 transition-colors ml-2"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide font-medium">Rating:</span>
            <input
              type="text"
              inputMode="numeric"
              value={rating}
              onChange={(e) => handleRatingChange(e.target.value)}
              placeholder="?"
              className="w-10 sm:w-12 h-7 sm:h-8 text-center text-sm sm:text-base font-bold rounded-lg bg-zinc-800 border border-zinc-700/50 text-fuchsia-400 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            <span className="text-xs sm:text-sm font-medium">/10</span>
          </div>

          {/* Review Text */}
          {selectedMovie && ratingNum > 0 && (
            <textarea
              placeholder="Share your thoughts (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all resize-none h-20 sm:h-24"
            />
          )}

          {/* Submit Button */}
          <button
            onClick={submitReview}
            disabled={submitting || !selectedMovie || ratingNum === 0}
            className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 text-white font-semibold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Star size={14} className={ratingNum > 0 ? "fill-current" : ""} />
                Post Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

