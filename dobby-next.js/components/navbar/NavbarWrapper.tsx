"use client"; // client component because of the usePathname, if we didn't create the seperate component, we would have had to put this into the root layout making our entire app client side (bad :( , no SEO)
import { usePathname, useRouter } from "next/navigation";
import { Navbar05 } from "@/components/ui/shadcn-io/navbar-05";
import Image from "next/image";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const router = useRouter();
  const showNavbarOn = [
    "/",
    "/home",
    "/movies",
    "/shows",
    "/moviesForYou",
    "/showsForYou",
  ];

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
        <div className="flex items-center gap-2">
          <Image
            src="/vercel.svg"
            alt="Next.js Logo"
            width={28}
            height={28}
            priority
          />
          <span className="font-bold text-xl">Dobby</span>
        </div>
      }
      onNavItemClick={handleNavItemClick}
      navigationLinks={[
        { label: "Home", href: "/" },
        { label: "Movies", href: "/movies" },
        { label: "Shows", href: "/shows" },
        { label: "Movies For You", href: "/moviesForYou" },
        { label: "Shows For You", href: "/showsForYou" },
      ]}
      userName="Jane Doe"
      userEmail="jane@myapp.com"
      notificationCount={6}
    />
  );
}

