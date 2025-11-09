import { Star } from "lucide-react";
import { recentReviews } from "@/data/mockData";

export function RecentReviewsSection() {
  return (
    <section className="w-full py-16 bg-zinc-900/50 px-6 max-w-6xl rounded-xl">
      <div className="flex items-center gap-3 mb-8">
        <Star className="w-8 h-8 text-yellow-400" />
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Recent Reviews
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentReviews.map((review) => (
          <div
            key={review.id}
            className="p-6 rounded-xl bg-zinc-800/60 border border-zinc-700 hover:border-yellow-400/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">{review.author}</h4>
              <span className="text-yellow-400 font-bold">★ {review.rating}</span>
            </div>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">{review.content}</p>
            <div className="flex items-center justify-between text-gray-500 text-xs">
              <span>{review.date}</span>
              <span>👍 {review.likes}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}