export interface FilterConfig {
  minVoteAverage: number;
  minYear: number;
  midTierVoteAverage: number;
  midTierYear: number;
}

export const MOVIE_FILTER_CONFIG: FilterConfig = {
  minVoteAverage: 5.1,
  minYear: 1991,
  midTierVoteAverage: 7.4,
  midTierYear: 2008,
};

export const SHOW_FILTER_CONFIG: FilterConfig = {
  minVoteAverage: 5.1,
  minYear: 1991,
  midTierVoteAverage: 7.4,
  midTierYear: 2008,
};
