import { NextResponse } from 'next/server';
import { GET } from '@/app/api/movies/[id]/route';
import { get_options } from '@/lib/TMDB_API/requestOptions';

// Polyfill Request for Node environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(public url: string, public init?: RequestInit) {}
  } as any;
}

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    })),
  },
}));

// Mock TMDB request options
jest.mock('@/lib/TMDB_API/requestOptions', () => ({
  get_options: { method: 'GET', headers: { Authorization: 'Bearer mock-token' } },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Movie API Route - GET /api/movies/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movie details successfully', async () => {
    const mockMovie = {
      id: 550,
      title: 'Fight Club',
      overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
      poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdrop_path: '/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg',
      vote_average: 8.433,
      release_date: '1999-10-15',
      runtime: 139,
      genres: [{ id: 18, name: 'Drama' }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovie,
    });

    const request = new Request('http://localhost:3000/api/movies/550');
    const params = Promise.resolve({ id: '550' });

    await GET(request, { params });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/550',
      get_options
    );
    expect(NextResponse.json).toHaveBeenCalledWith(mockMovie);
  });

  it('handles TMDB API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        status_message: 'The resource you requested could not be found.',
        status_code: 34,
      }),
    });

    const request = new Request('http://localhost:3000/api/movies/999999');
    const params = Promise.resolve({ id: '999999' });

    await GET(request, { params });

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Failed to fetch movie details'),
      }),
      { status: 404 }
    );
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const request = new Request('http://localhost:3000/api/movies/550');
    const params = Promise.resolve({ id: '550' });

    await GET(request, { params });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  });

  it('fetches different movie IDs correctly', async () => {
    const mockMovie = { id: 680, title: 'Pulp Fiction' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovie,
    });

    const request = new Request('http://localhost:3000/api/movies/680');
    const params = Promise.resolve({ id: '680' });

    await GET(request, { params });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/680',
      get_options
    );
  });

  it('returns complete movie data with all fields', async () => {
    const completeMovie = {
      id: 550,
      title: 'Fight Club',
      original_title: 'Fight Club',
      overview: 'A detailed overview',
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      vote_average: 8.5,
      vote_count: 25000,
      release_date: '1999-10-15',
      runtime: 139,
      budget: 63000000,
      revenue: 100853753,
      genres: [{ id: 18, name: 'Drama' }],
      production_companies: [{ id: 508, name: 'Regency Enterprises' }],
      spoken_languages: [{ iso_639_1: 'en', name: 'English' }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => completeMovie,
    });

    const request = new Request('http://localhost:3000/api/movies/550');
    const params = Promise.resolve({ id: '550' });

    await GET(request, { params });

    expect(NextResponse.json).toHaveBeenCalledWith(completeMovie);
  });
});
