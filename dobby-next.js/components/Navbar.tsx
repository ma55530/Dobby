import Link from "next/link";
import { Search, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="relative text-2xl font-black tracking-tight bg-gradient-to-br from-primary via-purple-500 to-purple-300 bg-clip-text text-transparent hover:scale-105 transition-transform"
            style={{
              textShadow: "0 0 20px rgba(147, 51, 234, 0.4)",
              WebkitTextStroke: "0.3px rgba(147, 51, 234, 0.2)",
            }}
          >
            Dobby
          </Link>

          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search movies and TV shows..."
                className="pl-10 bg-card/50 border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
