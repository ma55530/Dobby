"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, User as UserIcon, Star, UserPlus, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  age?: number | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
}

interface FollowStatus {
  isFollowing: boolean;
  followsYouBack: boolean;
}

interface FollowCounts {
  followers: number;
  following: number;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({ isFollowing: false, followsYouBack: false });
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const topMovies = ["Interstellar", "Parasite", "The Godfather", "Whiplash"];
  const topShows = ["Dark", "Chernobyl", "Breaking Bad", "True Detective"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile
        const profileRes = await fetch(`/api/users/${unwrappedParams.id}`);
        if (!profileRes.ok) {
          setError("User not found");
          setLoading(false);
          return;
        }
        const userData = await profileRes.json();
        setProfile(userData);

        // Check if it's own profile
        const currentUserRes = await fetch("/api/user");
        if (currentUserRes.ok) {
          const currentUser = await currentUserRes.json();
          if (currentUser.id === userData.id) {
            setIsOwnProfile(true);
            setLoading(false);
            return;
          }

          // Fetch follow status
          const followRes = await fetch(`/api/follows/status/${userData.id}`);
          if (followRes.ok) {
            const followData = await followRes.json();
            setFollowStatus(followData);
          }
        }

        // Fetch follow counts
        const countsRes = await fetch(`/api/follows/count/${userData.id}`);
        if (countsRes.ok) {
          const countsData = await countsRes.json();
          setFollowCounts(countsData);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [unwrappedParams.id]);

  const handleFollow = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });

      if (res.ok) {
        setFollowStatus({ ...followStatus, isFollowing: true });
        setFollowCounts({ ...followCounts, followers: followCounts.followers + 1 });
      }
    } catch (err) {
      console.error("Error following:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/follows?userId=${profile.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFollowStatus({ ...followStatus, isFollowing: false });
        setFollowCounts({ ...followCounts, followers: followCounts.followers - 1 });
      }
    } catch (err) {
      console.error("Error unfollowing:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl text-white mb-4">{error || "User not found"}</h2>
            <Button onClick={() => router.push("/users")}>Back to Search</Button>
          </div>
        </div>
      </main>
    );
  }

  if (isOwnProfile) {
    router.push("/profile");
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground">
      <section className="w-full px-6 pt-12 pb-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white">@{profile.username}</h1>
            <p className="text-gray-300 mt-2">User Profile</p>
          </div>

          {/* Follow Button */}
          {!followStatus.isFollowing && (
            <Button
              onClick={handleFollow}
              disabled={actionLoading}
              className="bg-purple-600 hover:bg-purple-500"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {actionLoading ? "Following..." : "Follow"}
            </Button>
          )}

          {followStatus.isFollowing && (
            <Button
              onClick={handleUnfollow}
              disabled={actionLoading}
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {actionLoading ? "Unfollowing..." : "Following"}
            </Button>
          )}
        </div>
      </section>

      <section className="w-full px-6 max-w-5xl pb-16">
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
                <p className="text-gray-400">
                  {profile.first_name} {profile.last_name}
                </p>
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

          {/* Right: bio and lists */}
          <div className="md:col-span-2 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700">
            <h3 className="text-white font-semibold text-lg mb-3">Bio</h3>
            <p className="text-gray-300 leading-relaxed">{profile.bio || "No bio yet."}</p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
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

              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
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
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-6 text-center text-gray-400 w-full mt-auto">
        © 2025 Dobby. Your social network for cinema.
      </footer>
    </main>
  );
}
