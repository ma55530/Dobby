"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/types/UserProfile";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { RecentActivity } from "@/components/profile/RecentActivity";
import { Footer } from "@/components/Footer";

export default function MePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedProfile, setUpdatedProfile] = useState<Partial<UserProfile>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/user");
      if (!res.ok) {
        setError("Failed to load profile");
        return;
      }
      const data = await res.json();
      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const updateProfile = async () => {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedProfile),
    });

    if (!res.ok) {
      const errorText = await res.text();
      setError(errorText);
      return;
    }

    const updatedData = await res.json();
    setProfile(updatedData);
  };

  const handleEditClick = () => {
    if (profile) {
      setUpdatedProfile({
        username: profile.username,
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        age: profile.age,
        bio: profile.bio ?? "",
      });
      setOpen(true);
    }
  };

  const handleSave = async () => {
    await updateProfile();
    setOpen(false);
  };

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
            <ProfileCard profile={profile} onEditClick={handleEditClick} />
            <ProfileBio profile={profile} />
            <RecentActivity />
          </div>
        ) : (
          <div className="text-center text-gray-300">
            {error
              ? error.toLowerCase().includes("unauthorized")
                ? "Not logged in."
                : error
              : "No profile data."}
          </div>
        )}
      </section>

      {profile && (
        <EditProfileDialog
          open={open}
          onOpenChange={setOpen}
          profile={profile}
          updatedProfile={updatedProfile}
          onUpdateProfile={setUpdatedProfile}
          onSave={handleSave}
        />
      )}

      <Footer />
    </main>
  );
}