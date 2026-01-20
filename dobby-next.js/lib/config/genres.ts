export type GenreConfig = {
   id: number;
   name: string;
   modelKey?: string;
};

export const TMDB_MOVIE_GENRES: GenreConfig[] = [
   { id: 28, name: "Action", modelKey: "g5" },
   { id: 12, name: "Adventure", modelKey: "g0" },
   { id: 16, name: "Animation", modelKey: "g2" },
   { id: 35, name: "Comedy", modelKey: "g6" },
   { id: 80, name: "Crime", modelKey: "g10" },
   { id: 99, name: "Documentary", modelKey: "g11" },
   { id: 18, name: "Drama", modelKey: "g3" },
   { id: 10751, name: "Family", modelKey: "g16" },
   { id: 14, name: "Fantasy", modelKey: "g1" },
   { id: 36, name: "History", modelKey: "g7" },
   { id: 27, name: "Horror", modelKey: "g4" },
   { id: 10402, name: "Music", modelKey: "g14" },
   { id: 9648, name: "Mystery", modelKey: "g13" },
   { id: 10749, name: "Romance", modelKey: "g15" },
   { id: 878, name: "Science Fiction", modelKey: "g12" },
   { id: 10770, name: "TV Movie", modelKey: "g18" },
   { id: 53, name: "Thriller", modelKey: "g9" },
   { id: 10752, name: "War", modelKey: "g17" },
   { id: 37, name: "Western", modelKey: "g8" },
];

export const TMDB_TV_GENRES: GenreConfig[] = [
   { id: 10759, name: "Action & Adventure" },
   { id: 16, name: "Animation" },
   { id: 35, name: "Comedy" },
   { id: 80, name: "Crime" },
   { id: 99, name: "Documentary" },
   { id: 18, name: "Drama" },
   { id: 10751, name: "Family" },
   { id: 10762, name: "Kids" },
   { id: 9648, name: "Mystery" },
   { id: 10763, name: "News" },
   { id: 10764, name: "Reality" },
   { id: 10765, name: "Sci-Fi & Fantasy" },
   { id: 10766, name: "Soap" },
   { id: 10767, name: "Talk" },
   { id: 10768, name: "War & Politics" },
   { id: 37, name: "Western" },
];

const combined = new Map<number, GenreConfig>();
TMDB_MOVIE_GENRES.forEach((genre) => combined.set(genre.id, genre));
TMDB_TV_GENRES.forEach((genre) => {
   if (!combined.has(genre.id)) combined.set(genre.id, genre);
});

export const TMDB_GENRES: GenreConfig[] = Array.from(combined.values());

const nameToKeyMap = new Map(
   TMDB_GENRES.filter((g) => g.modelKey).map((g) => [g.name, g.modelKey as string])
);
const keyToNameMap = new Map(
   TMDB_GENRES.filter((g) => g.modelKey).map((g) => [g.modelKey as string, g.name])
);
const idToNameMap = new Map(TMDB_GENRES.map((g) => [g.id, g.name]));

export const getGenreKeyByName = (name: string) => nameToKeyMap.get(name);
export const getGenreNameByKey = (key: string) => keyToNameMap.get(key);
export const getGenreNameById = (id: number) => idToNameMap.get(id);
