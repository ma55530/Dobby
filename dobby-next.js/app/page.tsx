"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to /home
    router.push("/home");
  }, [router]);

  return null;
}
