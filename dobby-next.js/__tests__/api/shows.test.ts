import { GET } from '@/app/api/shows/[id]/route';
import { NextResponse } from 'next/server';

// Polyfill Request for Node.js environment
if (typeof global.Request === 'undefined') {
  global.Request = class {
    constructor(public url: string) {}
  } as any;
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, config) => ({ data, ...config })),
  },
}));

jest.mock('@/lib/TMDB_API/requestOptions', () => ({
  get_options: {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer test-token',
    },
  },
}));

global.fetch = jest.fn();

describe('/api/shows/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns show details from TMDB API', async () => {
    const mockShow = {
      id: 1399,
      name: 'Breaking Bad',
      overview: 'A show about a chemistry teacher',
      first_air_date: '2008-01-20',
      vote_average: 9.5,
      popularity: 1000,
      poster_path: '/ggFHVNu6UUThW5pFZrFvCeDVjXq.jpg',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockShow,
    });

    await GET(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1399' }),
    });

    expect(NextResponse.json).toHaveBeenCalledWith(mockShow);
  });

  it('returns error when TMDB API fails', async () => {
    const errorData = {
      status_message: 'Invalid API key',
      status_code: 401,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => errorData,
    });

    await GET(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1399' }),
    });

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Failed to fetch show details from TMDB'),
      }),
      { status: 401 }
    );
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    await GET(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1399' }),
    });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  });

  it('passes correct show ID to TMDB API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1399, name: 'Breaking Bad' }),
    });

    await GET(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1399' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/tv/1399',
      expect.any(Object)
    );
  });

  it('handles different show IDs correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 60573, name: 'Peaky Blinders' }),
    });

    await GET(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '60573' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/tv/60573',
      expect.any(Object)
    );
  });
});
