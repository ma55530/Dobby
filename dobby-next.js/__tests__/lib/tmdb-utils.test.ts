import { getImageUrl, getMovieDetails, getShowDetails } from '@/lib/TMDB_API/utils';

// Mock fetch globally
global.fetch = jest.fn();

describe('TMDB API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getImageUrl', () => {
    it('generates correct URL for small size', () => {
      const url = getImageUrl('/poster.jpg', 'small');
      expect(url).toBe('https://image.tmdb.org/t/p/w342/poster.jpg');
    });

    it('generates correct URL for medium size (default)', () => {
      const url = getImageUrl('/poster.jpg');
      expect(url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    });

    it('generates correct URL for large size', () => {
      const url = getImageUrl('/poster.jpg', 'large');
      expect(url).toBe('https://image.tmdb.org/t/p/w1280/poster.jpg');
    });

    it('generates correct URL for original size', () => {
      const url = getImageUrl('/poster.jpg', 'original');
      expect(url).toBe('https://image.tmdb.org/t/p/original/poster.jpg');
    });

    it('handles paths without leading slash', () => {
      const url = getImageUrl('poster.jpg', 'medium');
      expect(url).toBe('https://image.tmdb.org/t/p/w500poster.jpg');
    });

    it('handles empty image paths', () => {
      const url = getImageUrl('', 'medium');
      expect(url).toBe('https://image.tmdb.org/t/p/w500');
    });
  });

  describe('getMovieDetails', () => {
    it('fetches movie details successfully', async () => {
      const mockMovie = {
        id: 550,
        title: 'Fight Club',
        overview: 'A movie about fighting',
        poster_path: '/poster.jpg',
        vote_average: 8.5,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovie,
      });

      const result = await getMovieDetails(550);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/movies/550',
        expect.objectContaining({
          next: { revalidate: 3600 }
        })
      );
      expect(result).toEqual(mockMovie);
    });

    it('returns null when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const result = await getMovieDetails(999999);

      expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await getMovieDetails(550);

      expect(result).toBeNull();
    });

    it('handles invalid movie IDs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      const result = await getMovieDetails(-1);

      expect(result).toBeNull();
    });
  });

  describe('getShowDetails', () => {
    it('fetches show details successfully', async () => {
      const mockShow = {
        id: 1396,
        name: 'Breaking Bad',
        overview: 'A chemistry teacher turns to cooking meth',
        poster_path: '/poster.jpg',
        vote_average: 9.2,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockShow,
      });

      const result = await getShowDetails(1396);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/shows/1396',
        expect.objectContaining({
          next: { revalidate: 3600 }
        })
      );
      expect(result).toEqual(mockShow);
    });

    it('returns null when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const result = await getShowDetails(999999);

      expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await getShowDetails(1396);

      expect(result).toBeNull();
    });

    it('caches responses with revalidation', async () => {
      const mockShow = { id: 1396, name: 'Breaking Bad' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockShow,
      });

      await getShowDetails(1396);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { revalidate: 3600 }
        })
      );
    });
  });
});
