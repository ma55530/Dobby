export interface Show {
  adult: boolean; // whether the show is marked as adult/18+
  backdrop_path: string | null; // backdrop image path
  genre_ids: number[];
  id: number;
  origin_country: string[];
  original_language: string;
  original_name: string; // original (non-localized) show name
  overview: string; // summary/description of the show
  popularity: number; // TMDB popularity score 
  poster_path: string; // poster image path
  first_air_date: string; // first air date in YYYY-MM-DD format
  name: string; // localized name based on request locale
  vote_average: number; // average user rating (0–10)
  vote_count: number; // number of votes contributing to vote_average
}