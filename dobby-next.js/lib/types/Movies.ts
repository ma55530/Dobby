export interface Movies {
  adult: boolean;  //adult content, 18+
  backdrop_path: string | null; //large backdrop image
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string; //description of a movie
  popularity: number; // popularity score by TMDB
  poster_path: string | null; //large poster image
  release_date: string;
  title: string; //localized title, based on language query 
  video: boolean; //indicates if the item is actually a video file/trailer instead of a full movie (rarely true).
  vote_average: number; //average rating of a movie from 0 to 10
  vote_count: number; //no. of ratings for the movie
}
