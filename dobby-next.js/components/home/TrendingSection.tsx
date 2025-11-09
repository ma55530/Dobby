import { TrendingUp } from "lucide-react";
import TrendingMovies from "@/components/trending/TrendingMovies";

export function TrendingSection() {
  return (
    <section className="w-full py-8 px-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="w-8 h-8 text-purple-400" />
        <h2 className="text-3xl md:text-4xl font-bold text-white">Trending Now</h2>
      </div>
      <TrendingMovies />
    </section>
  );
}