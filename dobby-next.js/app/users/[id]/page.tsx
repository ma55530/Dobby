"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, User as UserIcon, UserPlus, UserCheck, Film, Tv, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewCard from "@/components/cards/ReviewCard";

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

interface ProfileStats {
  favoriteGenres: string[];
  topMovies: Array<{ id: number; title: string; poster_path: string | null; rating: number | null }>;
  topShows: Array<{ id: number; name: string; poster_path: string | null; rating: number | null }>;
}

interface WatchlistItem {
  type: "movie" | "show";
  id: number;
  title: string;
  poster_path: string | null;
}

interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
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
  const [profileStats, setProfileStats] = useState<ProfileStats>({ favoriteGenres: [], topMovies: [], topShows: [] });
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);

  const getImageUrl = (path: string | null) => {
    if (!path) return "/assets/placeholder.png";
    if (path.startsWith("http")) return path;
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch(`/api/users/${unwrappedParams.id}`);
        if (!profileRes.ok) {
          setError("User not found");
          setLoading(false);
          return;
        }
        const userData = await profileRes.json();
        setProfile(userData);

        const currentUserRes = await fetch("/api/user");
        if (currentUserRes.ok) {
          const currentUser = await currentUserRes.json();
          if (currentUser.id === userData.id) {
            setIsOwnProfile(true);
            setLoading(false);
            return;
          }

          const followRes = await fetch(`/api/follows/status/${userData.id}`);
          if (followRes.ok) {
            const followData = await followRes.json();
            setFollowStatus(followData);
          }
        }

        const countsRes = await fetch(`/api/follows/count/${userData.id}`);
        if (countsRes.ok) {
          const countsData = await countsRes.json();
          setFollowCounts({
            followers: countsData.followersCount ?? countsData.followers ?? 0,
            following: countsData.followingCount ?? countsData.following ?? 0,
          });
        }

        const statsRes = await fetch(`/api/users/${userData.id}/profile-stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setProfileStats({
            favoriteGenres: statsData.favoriteGenres || [],
            topMovies: statsData.topMovies || [],
            topShows: statsData.topShows || [],
          });
        }

        const watchlistsRes = await fetch(`/api/users/${userData.id}/watchlists`);
        if (watchlistsRes.ok) {
          const watchlistsData = await watchlistsRes.json();
          setWatchlists(
            watchlistsData.map((w: any) => ({
              ...w,
              items:
                w.watchlist_items?.map((i: any) => ({
                  type: i.movie_id ? "movie" : "show",
                  id: i.movie_id || i.show_id,
                  title: i.movies?.title || i.shows?.name || "Unknown",
                  poster_path: i.movies?.poster_path || i.shows?.poster_path || null,
                })) || [],
            })) || []
          );
        }

        const reviewsRes = await fetch(`/api/users/${userData.id}/reviews?limit=10`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setUserReviews(reviewsData.reviews || []);
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
        window.dispatchEvent(new CustomEvent('followStateChanged'));
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
      const res = await fetch(`/api/follows`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });

      if (res.ok) {
        setFollowStatus({ ...followStatus, isFollowing: false });
        setFollowCounts({ ...followCounts, followers: followCounts.followers - 1 });
        window.dispatchEvent(new CustomEvent('followStateChanged'));
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
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-foreground overflow-x-hidden">
      {/* HEADER SECTION */}
      <section className="w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-4 sm:pb-6 max-w-5xl mx-auto box-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white break-words">@{profile.username}</h1>
            <p className="text-gray-300 mt-2 text-sm sm:text-base">User Profile</p>
          </div>

          <div className="w-full sm:w-auto flex-shrink-0">
            {!followStatus.isFollowing ? (
              <Button
                onClick={handleFollow}
                disabled={actionLoading}
                className="cursor-pointer bg-purple-600 hover:bg-purple-500 w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {actionLoading ? "Following..." : "Follow"}
              </Button>
            ) : (
              <Button
                onClick={handleUnfollow}
                disabled={actionLoading}
                variant="outline"
                className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white w-full sm:w-auto"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {actionLoading ? "Unfollowing..." : "Following"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* GRID SECTION */}
      <section className="w-full px-4 sm:px-6 max-w-5xl mx-auto pb-12 sm:pb-16 box-border overflow-hidden">
        <div className="grid gap-6 md:grid-cols-3 min-w-0 w-full">
          
          {/* Left: Profile Card */}
          <div className="p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 w-full min-w-0 overflow-hidden">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-purple-400 to-yellow-400 overflow-hidden ring-2 ring-purple-400/40">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.username} fill sizes="112px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                    {(profile.first_name?.[0] || profile.username[0]).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white break-all">@{profile.username}</h2>
              {(profile.first_name || profile.last_name) && (
                <p className="text-gray-400">
                  {profile.first_name} {profile.last_name}
                </p>
              )}
              
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

          {/* Right: Bio & Genres/Movies */}
          <div className="md:col-span-2 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 w-full min-w-0 overflow-hidden">
            <h3 className="text-white font-semibold text-lg mb-3">Bio</h3>
            <p className="text-gray-300 leading-relaxed break-words">{profile.bio || "No bio yet."}</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 min-w-0 overflow-hidden">
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
                    <span className="text-xs text-gray-500">No genres yet.</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-white font-medium">Top movies</span>
                </div>
                {profileStats.topMovies.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {profileStats.topMovies.slice(0, 3).map((movie) => (
                      <Link
                        key={`top-movie-${movie.id}`}
                        href={`/movies/${movie.id}`}
                        className="relative group aspect-[2/3] w-full"
                        title={movie.title}
                      >
                        <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-800 border border-zinc-700">
                          {movie.poster_path ? (
                            <Image
                              src={getImageUrl(movie.poster_path)}
                              alt={movie.title}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">No movie ratings yet.</span>
                )}
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-white font-medium">Top shows</span>
                </div>
                {profileStats.topShows.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {profileStats.topShows.slice(0, 3).map((show) => (
                      <Link
                        key={`top-show-${show.id}`}
                        href={`/shows/${show.id}`}
                        className="relative group aspect-[2/3] w-full"
                        title={show.name}
                      >
                        <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-800 border border-zinc-700">
                          {show.poster_path ? (
                            <Image
                              src={getImageUrl(show.poster_path)}
                              alt={show.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <Tv className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">No show ratings yet.</span>
                )}
              </div>
            </div>
          </div>

          {/* Watchlists */}
          <div className="md:col-span-3 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 w-full min-w-0 overflow-hidden">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2 mb-4">
              <Bookmark className="w-5 h-5" /> Watchlists
            </h3>

            {watchlists.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No watchlists yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {watchlists.map((watchlist) => (
                  <div key={watchlist.id} className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium truncate pr-4">{watchlist.name}</h4>
                      <span className="text-sm text-gray-400 flex-shrink-0">{watchlist.items.length} items</span>
                    </div>

                    {watchlist.items.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {watchlist.items.slice(0, 5).map((item) => (
                          <Link
                            key={`${item.type}-${item.id}`}
                            href={`/${item.type === "movie" ? "movies" : "shows"}/${item.id}`}
                            className="flex-shrink-0 w-24"
                          >
                            <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-zinc-800 border border-zinc-700">
                              {item.poster_path ? (
                                <Image
                                  src={getImageUrl(item.poster_path)}
                                  alt={item.title}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  {item.type === "movie" ? <Film className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No items yet</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="md:col-span-3 p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 w-full min-w-0 overflow-hidden">
            <h3 className="text-white font-semibold text-lg mb-4 text-center">Recent activity</h3>
            {userReviews.length > 0 ? (
              <div className="space-y-6 flex flex-col items-center w-full">
                {userReviews.map((review) => (
                  <div key={review.id} className="w-full flex justify-center overflow-hidden">
                    <ReviewCard post={review} isNested={true} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center">No recent activity yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}