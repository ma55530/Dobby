"use client"; // client component because of the usePathname, if we didn't create the seperate component, we would have had to put this into the root layout making our entire app client side (bad :( , no SEO)
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar05 } from "@/components/ui/shadcn-io/navbar-05";
import Image from "next/image";

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
    "/users",
    "/watchlist",
    "/profile",
  ];

  useEffect(() => {
  const fetchProfile = async () => {
    const res = await fetch("/api/user");
    if (!res.ok) return;
    const profile = await res.json();
    setSessionUser({
      email: profile.email,
      name: profile.username,
      avatar: profile.avatar_url,
    });
  };
  fetchProfile();
}, []);

  // Check if pathname starts with any of the array entries
  const shouldHideNavbar = !showNavbarOn.some((route) =>
    pathname.startsWith(route)
  );

  if (shouldHideNavbar) return null;

  const handleNavItemClick = (href: string) => {
    router.push(href);
  };

  return (
    <Navbar05
      logo={
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent font-semibold tracking-wide text-2xl">
          <Image src="/vercel.svg" alt="Next.js Logo" width={24} height={24} />
          <span>Dobby</span>
        </div>
      }
      onNavItemClick={handleNavItemClick}
      navigationLinks={[
        { label: "Home", href: "/" },
        { label: "Movies", href: "/movies" },
        { label: "Shows", href: "/shows" },
        { label: "Users", href: "/users" },
      ]}
      userName={sessionUser?.name || "Guest"}
      userEmail={sessionUser?.email || ""}
    />
  );
}
