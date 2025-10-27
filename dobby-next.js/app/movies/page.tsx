import TrackCard from "@/components/tracks/TrackCard";
import { Movie } from "@/lib/types/Movie";

export default function Home() {
  const sampleMovie: Movie = {
    adult: false,
    backdrop_path: "/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg",
    genre_ids: [53, 28, 80, 18, 9648],
    id: 343611,
    original_language: "en",
    original_title: "Jack Reacher: Never Go Back",
    overview: "Jack Reacher must uncover the truth behind a major government conspiracy in order to clear his name. On the run as a fugitive from the law, Reacher uncovers a potential secret from his past that could change his life forever.",
    popularity: 26.818468,
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    release_date: "2016-10-19",
    title: "Jack Reacher: Never Go Back",
    video: false,
    vote_average: 4.19,
    vote_count: 201
  };

  return (
    <div className="p-4">
      <TrackCard movie={sampleMovie} />
    </div>
  );
}
