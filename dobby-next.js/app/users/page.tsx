"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface UserSearchResult {
  id: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Find Friends</h1>
        <p className="text-gray-400 mb-8">Search for friends by username or name</p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-zinc-900 border-zinc-700 text-white placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-md transition"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Results */}
        {loading && (
          <div className="text-center text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="mt-2">Searching...</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">No friends found</p>
            <p className="text-sm mt-2">Try a different search term</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-gray-400 mb-4">
              Found {results.length} {results.length === 1 ? "friend" : "friends"}
            </p>
            {results.map((user) => (
              <Link key={user.id} href={`/users/${user.username}`}>
                <Card className="bg-zinc-900/60 border-zinc-700 hover:border-purple-400 transition cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-yellow-400 overflow-hidden ring-2 ring-purple-400/40 flex-shrink-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                            {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white truncate">
                          @{user.username}
                        </h3>
                        {(user.first_name || user.last_name) && (
                          <p className="text-gray-400">
                            {user.first_name} {user.last_name}
                          </p>
                        )}
                        {user.bio && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                      </div>

                      {/* Arrow Icon */}
                      <div className="text-gray-400">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!searched && (
          <div className="text-center text-gray-500 py-12">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Start typing to search for users</p>
          </div>
        )}
      </div>
    </main>
  );
}
