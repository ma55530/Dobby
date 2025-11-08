"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Mail, Calendar, User as UserIcon, Film, Star, Heart } from "lucide-react";
import type { UserProfile } from "@/lib/types/UserProfile";
import { fetchCurrentUser } from "@/lib/user";

export default function MePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const favoriteGenres = ["Sci‑Fi", "Drama", "Thriller", "Mystery", "Animation"];
  const topMovies = ["Interstellar", "Parasite", "The Godfather", "Whiplash"];
  const topShows = ["Dark", "Chernobyl", "Breaking Bad", "True Detective"];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchCurrentUser();
        if (!active) return;
        setProfile(data);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Could not load profile");
        setProfile(null); //fallback?
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">
      <section className="w-full px-6 pt-12 pb-6 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white">About me</h1>
        <p className="text-gray-300 mt-2">A quick snapshot of who I am and what I love to watch</p>
        {error && (
          <div className="mt-3 text-xs text-red-400">
            {error.toLowerCase().includes("unauthorized") ? "Not logged in." : error}
          </div>
        )}
      </section>

      <section className="w-full px-6 max-w-5xl pb-16">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 h-64 animate-pulse" />
            <div className="md:col-span-2 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 h-64 animate-pulse" />
            <div className="md:col-span-3 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 h-40 animate-pulse" />
          </div>
        ) : profile ? (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-xl bg-zinc-800/60 border border-zinc-700">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-purple-400 to-yellow-400 overflow-hidden ring-2 ring-purple-400/40">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                      {(profile.first_name?.[0] || profile.username[0]).toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">@{profile.username}</h2>
                {(profile.first_name || profile.last_name) && (
                  <p className="text-gray-400">{profile.first_name} {profile.last_name}</p>
                )}
                <div className="mt-4 w-full space-y-2 text-sm text-gray-300">
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Joined {formatDate(profile.created_at)}</span>
                  </div>
                  {profile.age && (
                    <div className="flex items-center justify-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span>{profile.age} years old</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700">
              <h3 className="text-white font-semibold text-lg mb-3">Bio</h3>
              <p className="text-gray-300 leading-relaxed">
                {profile.bio || "No bio yet."}
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">Favorite genres</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {favoriteGenres.map(g => (
                      <span key={g} className="text-xs px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-gray-300">
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
                    {topMovies.map(m => (
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
                  {topShows.map(s => (
                    <li key={s} className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-purple-300" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="md:col-span-3 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700">
              <h3 className="text-white font-semibold text-lg mb-3">Recent activity</h3>
              <p className="text-gray-400 text-sm">No recent activity yet.</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-300">
            {error
              ? (error.toLowerCase().includes("unauthorized") ? "Not logged in." : error)
              : "No profile data."}
          </div>
        )}
      </section>

      <footer className="border-t border-zinc-800 py-6 text-center text-gray-400 w-full mt-auto">
        © 2025 Dobby. Your social network for cinema.
      </footer>
    </main>
  );
}