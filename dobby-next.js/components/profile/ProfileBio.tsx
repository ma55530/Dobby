"use client";

import { Star } from "lucide-react";
import type { UserProfile } from "@/lib/types/UserProfile";

interface ProfileBioProps {
  profile: UserProfile;
}

const favoriteGenres = ["Sci‑Fi", "Drama", "Thriller", "Mystery", "Animation"];
const topMovies = ["Interstellar", "Parasite", "The Godfather", "Whiplash"];
const topShows = ["Dark", "Chernobyl", "Breaking Bad", "True Detective"];

export function ProfileBio({ profile }: ProfileBioProps) {
  return (
    <div className="md:col-span-2 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700">
      <h3 className="text-white font-semibold text-lg mb-3">Bio</h3>
      <p className="text-gray-300 leading-relaxed">{profile.bio || "No bio yet."}</p>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-medium">Favorite genres</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteGenres.map((g) => (
              <span
                key={g}
                className="text-xs px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-gray-300"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-medium">Top movies</span>
          </div>
          <ul className="text-gray-300 text-sm space-y-1">
            {topMovies.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-400" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-medium">Top shows</span>
        </div>
        <ul className="text-gray-300 text-sm space-y-1">
          {topShows.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <Star className="w-3 h-3 text-purple-300" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}