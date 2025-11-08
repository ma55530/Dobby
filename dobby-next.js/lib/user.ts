import type { UserProfile } from "@/lib/types/UserProfile";

export async function fetchCurrentUser(): Promise<UserProfile> {
  const res = await fetch("/api/user", { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load profile (status ${res.status})`);
  }
  return res.json();
}