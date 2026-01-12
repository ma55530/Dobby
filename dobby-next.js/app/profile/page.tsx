"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Calendar, User as UserIcon, Star, Bookmark, Film, Tv } from "lucide-react";
import type { UserProfile } from "@/lib/types/UserProfile";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/TMDB_API/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Genre {
  id: number;
  name: string;
}

interface WatchlistItem {
  type: 'movie' | 'show';
  id: number;
  title: string;
  poster_path: string | null;
}

interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}

export default function MePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedProfile, setUpdatedProfile] = useState<Partial<UserProfile>>({});
  const [open, setOpen] = useState(false);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [favoriteGenreIds, setFavoriteGenreIds] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [profileStats, setProfileStats] = useState<{
    favoriteGenres: string[];
    topMovies: Array<{ id: number; title: string; genres: Array<{ id: number; name: string }> }>;
    topShows: Array<{ id: number; name: string; genres: Array<{ id: number; name: string }> }>;
  }>({
    favoriteGenres: [],
    topMovies: [],
    topShows: [],
  });
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [profileRes, genresRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/genres"),
      ]);

      if (!profileRes.ok) {
        setError("Failed to load profile");
        setLoading(false);
        return;
      }
      const profileData = await profileRes.json();
      setProfile(profileData);

      if (genresRes.ok) {
        const genresData = await genresRes.json();
        setAllGenres(genresData.genres || []);
      }

      // Load favorite genres from profile
      if (profileData.favorite_genres) {
        setFavoriteGenreIds(profileData.favorite_genres);
      }
      
      // Fetch follow counts
      if (profileData.id) {
        const countsRes = await fetch(`/api/user/follow?id=${profileData.id}`);
        if (countsRes.ok) {
          const countsData = await countsRes.json();
          setFollowCounts(countsData);
        }
      }
      
      setLoading(false);
    };

    const fetchProfileStats = async () => {
      try {
        const res = await fetch("/api/user/profile-stats");
        if (res.ok) {
          const stats = await res.json();
          setProfileStats(stats);
        }
      } catch (err) {
        console.error("Failed to load profile stats:", err);
      }
    };

    const fetchWatchlists = async () => {
      try {
        const res = await fetch("/api/watchlist");
        if (res.ok) {
          const data = await res.json();
          setWatchlists(data.watchlists || []);
        }
      } catch (err) {
        console.error("Failed to load watchlists:", err);
      }
    };

    fetchData();
    fetchProfileStats();
    fetchWatchlists();
  }, []);

  const updateProfile = async () => {
    // 1. Upload avatar if selected
    let newAvatarUrl = null;
    if (selectedFile) {
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      try {
        const res = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Upload failed:", errorText);
          alert("Failed to upload image");
          return;
        }

        const data = await res.json();
        newAvatarUrl = data.avatar_url;
      } catch (err) {
        console.error("Error uploading avatar:", err);
        alert("Error uploading avatar");
        return;
      }
    }
    // 2. Update profile data
    const finalProfileUpdate = { ...updatedProfile };
    if (newAvatarUrl) {
      finalProfileUpdate.avatar_url = newAvatarUrl;
    }

    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalProfileUpdate),
    });

    if (!res.ok) {
      const errorText = await res.text();
      setError(errorText);
      return;
    }

    const updatedData = await res.json();
    setProfile(updatedData);
  };

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
            {/* Left: profile card */}
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
                
                {/* Follow counts */}
                <div className="mt-4 flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{followCounts.followers}</p>
                    <p className="text-gray-400">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{followCounts.following}</p>
                    <p className="text-gray-400">Following</p>
                  </div>
                </div>

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

                {/* Edit controls */}
                <div className="mt-5 w-full flex justify-center">
                  <Dialog
                    open={open}
                    onOpenChange={(o) => {
                      setOpen(o);
                      if (o && profile) {
                        setUpdatedProfile({
                          username: profile.username,
                          first_name: profile.first_name ?? "",
                          last_name: profile.last_name ?? "",
                          age: profile.age,
                          bio: profile.bio ?? "",
                        });
                        setFavoriteGenreIds(profile.favorite_genres ?? []);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        className="px-3 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-700 text-gray-200 hover:bg-zinc-900 hover:border-purple-400 transition"
                      >
                        Edit Profile
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-zinc-900 border border-zinc-700 text-gray-200 max-h-[85vh] flex flex-col">
                    <DialogHeader className="space-y-2 flex-shrink-0">
                        <DialogTitle className="text-2xl font-semibold text-white text-left">
                            Edit Profile
                        </DialogTitle>
                        <DialogDescription className="text-gray-400 text-sm text-center max-w-sm mx-auto">
                            Update your profile info and save changes.
                        </DialogDescription>
                        </DialogHeader>

                      <div className="grid gap-3 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid gap-2.5">
                          <Label htmlFor="avatar">Profile Picture</Label>
                          {previewUrl && (
                            <div className="relative w-20 h-20 rounded-full overflow-hidden mx-auto mb-2 ring-2 ring-purple-400/40">
                              <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                            </div>
                          )}
                          <Input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            className="bg-zinc-900 border-zinc-700 text-gray-200"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert("File size too large (max 5MB)");
                                  e.target.value = ""; // Reset input
                                  return;
                                }
                                setSelectedFile(file);
                                setPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </div>
                        <div className="grid gap-2.5">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            className="bg-zinc-900 border-zinc-700 text-gray-200"
                            value={updatedProfile.username ?? profile.username ?? ""}
                            onChange={(e) => setUpdatedProfile({ ...updatedProfile, username: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2.5">
                          <Label htmlFor="first_name">First name</Label>
                          <Input
                            id="first_name"
                            className="bg-zinc-900 border-zinc-700 text-gray-200"
                            value={updatedProfile.first_name ?? profile.first_name ?? ""}
                            onChange={(e) => setUpdatedProfile({ ...updatedProfile, first_name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2.5">
                          <Label htmlFor="last_name">Last name</Label>
                          <Input
                            id="last_name"
                            className="bg-zinc-900 border-zinc-700 text-gray-200"
                            value={updatedProfile.last_name ?? profile.last_name ?? ""}
                            onChange={(e) => setUpdatedProfile({ ...updatedProfile, last_name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2.5">
                          <Label htmlFor="age">Age</Label>
                          <Input
                            id="age"
                            type="number"
                            className="bg-zinc-900 border-zinc-700 text-gray-200"
                            value={updatedProfile.age ?? profile.age ?? ""}
                            onChange={(e) =>
                              setUpdatedProfile({
                                ...updatedProfile,
                                age: e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2.5">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            rows={3}
                            className="bg-zinc-900 border-zinc-700 text-gray-200"
                            value={updatedProfile.bio ?? profile.bio ?? ""}
                            onChange={(e) => setUpdatedProfile({ ...updatedProfile, bio: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2.5">
                          <Label>Favorite Genres (Top 5)</Label>
                          <p className="text-xs text-gray-400">Select up to 5 favorite genres</p>
                          <div className="flex flex-wrap gap-2 p-3 rounded-md bg-zinc-900 border border-zinc-700 max-h-48 overflow-y-auto custom-scrollbar">
                            {allGenres.map((genre) => {
                              const isSelected = favoriteGenreIds.includes(genre.id);
                              return (
                                <button
                                  key={genre.id}
                                  type="button"
                                  onClick={() => {
                                    const newGenres = isSelected
                                      ? favoriteGenreIds.filter((id) => id !== genre.id)
                                      : favoriteGenreIds.length < 5
                                      ? [...favoriteGenreIds, genre.id]
                                      : favoriteGenreIds;
                                    setFavoriteGenreIds(newGenres);
                                  }}
                                  className={`px-3 py-1 text-xs rounded-full border transition ${
                                    isSelected
                                      ? "bg-purple-600 border-purple-400 text-white"
                                      : favoriteGenreIds.length >= 5
                                      ? "bg-zinc-800 border-zinc-700 text-gray-500 cursor-not-allowed"
                                      : "bg-zinc-800 border-zinc-700 text-gray-300 hover:border-purple-400"
                                  }`}
                                  disabled={!isSelected && favoriteGenreIds.length >= 5}
                                >
                                  {genre.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2 flex-shrink-0 pt-4 border-t border-zinc-700">
                        <button
                          onClick={() => setOpen(false)}
                          className="px-3 py-1.5 rounded-md bg-zinc-800/80 border border-zinc-700 text-gray-300 hover:bg-zinc-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            // Include favorite genres in update
                            await fetch("/api/user", {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                ...updatedProfile,
                                favorite_genres: favoriteGenreIds,
                              }),
                            }).then(async (res) => {
                              if (res.ok) {
                                const updatedData = await res.json();
                                setProfile(updatedData);
                              }
                            });
                            setOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-md bg-purple-600/80 border border-purple-400 text-white hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition"
                        >
                          Save Changes
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {/* Right: bio and lists */}
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
                    {profileStats.favoriteGenres.length > 0 ? (
                      profileStats.favoriteGenres.map((g) => (
                        <span key={g} className="text-xs px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-gray-300">
                          {g}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No genres yet. Watch some movies or shows!</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">Top movies</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {profileStats.topMovies.length > 0 ? (
                      profileStats.topMovies.map((m) => (
                        <li key={m.id} className="flex items-center gap-2">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {m.title}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500">No movies watched yet</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium">Top shows</span>
                </div>
                <ul className="text-gray-300 text-sm space-y-1">
                  {profileStats.topShows.length > 0 ? (
                    profileStats.topShows.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-purple-300" />
                        {s.name}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-gray-500">No shows watched yet</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Watchlists Section */}
            <div className="md:col-span-3 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700">
              <div className="flex items-center mb-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Bookmark className="w-5 h-5" />
                  My Watchlists
                </h3>
              </div>
              
              {watchlists.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No watchlists yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {watchlists.slice(0, 2).map((watchlist) => (
                    <div key={watchlist.id} className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">{watchlist.name}</h4>
                        <span className="text-sm text-gray-400">{watchlist.items.length} items</span>
                      </div>
                      
                      {watchlist.items.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto">
                          {watchlist.items.slice(0, 5).map((item) => (
                            <Link
                              key={`${item.type}-${item.id}`}
                              href={`/${item.type === 'movie' ? 'movies' : 'shows'}/${item.id}`}
                              className="flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                            >
                              <div className="relative w-20 h-28 rounded-md overflow-hidden bg-zinc-900 hover:ring-2 hover:ring-purple-400 transition">
                                {item.poster_path ? (
                                  <Image
                                    src={getImageUrl(item.poster_path)}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    {item.type === 'movie' ? (
                                      <Film className="w-6 h-6" />
                                    ) : (
                                      <Tv className="w-6 h-6" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </Link>
                          ))}
                          {watchlist.items.length > 5 && (
                            <div className="flex-shrink-0 w-20 h-28 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                              <span className="text-gray-400 text-sm font-medium">+{watchlist.items.length - 5}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No items yet</p>
                      )}
                    </div>
                  ))}
                  
                  {watchlists.length > 2 && (
                    <div className="text-center pt-2">
                      <Link href="/watchlist">
                        <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-purple-400 cursor-pointer">
                          +{watchlists.length - 2} more watchlists
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
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

      
    </main>
  );
}
