"use client";

import Image from "next/image";
import { Mail, Calendar, User as UserIcon } from "lucide-react";
import type { UserProfile } from "@/lib/types/UserProfile";

interface ProfileCardProps {
  profile: UserProfile;
  onEditClick: () => void;
}

export function ProfileCard({ profile, onEditClick }: ProfileCardProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
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

        <div className="mt-5 w-full flex justify-center">
          <button
            onClick={onEditClick}
            className="px-3 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-700 text-gray-200 hover:bg-zinc-900 hover:border-purple-400 transition"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}