"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar05 } from "@/components/ui/shadcn-io/navbar-05";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<{ email: string; name: string; avatar?: string } | null>(null);

  const showNavbarOn = [
    "/",
    "/home",
    "/movies",
    "/shows",
    "/movies/forYou",
    "/shows/forYou",
    "/profile"
  ];

  useEffect(() => {
    const shouldShowNavbar = showNavbarOn.some(route => pathname === route);
    if (!shouldShowNavbar) {
      setSessionUser(null);
      return;
    }
    
    const fetchProfile = async () => {
      const res = await fetch("/api/user");
      if (!res.ok) {
        setSessionUser(null);
        return;
      }
      const profile = await res.json();
      setSessionUser({
        email: profile.email,
        name: profile.username,
        avatar: profile.avatar_url,
      });
    };

    fetchProfile();
  }, [pathname, showNavbarOn]); 

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }
    setSessionUser(null);
    router.push("/auth/login");
  };

  if (!sessionUser) return null;

  const handleNavItemClick = (href: string) => router.push(href);

  return (
    <Navbar05
      logo={
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent font-semibold tracking-wide text-2xl">
          <Image src="/vercel.svg" alt="Next.js Logo" width={24} height={24} />
          <span>Dobby</span>
        </div>
      }
      onNavItemClick={handleNavItemClick}
      onUserItemClick={(item) => {
        if (item === "logout") handleLogout();
      }}
      navigationLinks={[
        { label: "Home", href: "/" },
        { label: "Movies", href: "/movies" },
        { label: "Shows", href: "/shows" },
      ]}
      userName={sessionUser?.name || "Guest"}
      userEmail={sessionUser?.email || ""}
      notificationCount={6}
    />
  );
}
