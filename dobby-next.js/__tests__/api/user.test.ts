import { NextResponse } from 'next/server';
import { GET } from '@/app/api/user/route';
import { createClient } from '@/lib/supabase/server';

// Mock Next.js
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('User API Route - GET /api/user', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('returns user profile for authenticated user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockProfile = {
      id: 'user-123',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      age: 25,
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      theme: 'dark',
      created_at: '2024-01-01T00:00:00Z',
    };

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValueOnce(mockFrom);

    await GET();

    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockFrom.select).toHaveBeenCalledWith('*');
    expect(mockFrom.eq).toHaveBeenCalledWith('id', 'user-123');
    expect(mockFrom.maybeSingle).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith(mockProfile);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    await GET();

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  });

  it('handles database errors gracefully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabase.from.mockReturnValueOnce(mockFrom);

    await GET();

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Database error' },
      { status: 400 }
    );
  });

  it('returns profile with favorite genres', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    const mockProfile = {
      id: 'user-123',
      username: 'moviefan',
      favorite_genres: [28, 878, 18], // Action, Sci-Fi, Drama
    };

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValueOnce(mockFrom);

    await GET();

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        favorite_genres: expect.arrayContaining([28, 878, 18]),
      })
    );
  });

  it('handles users with minimal profile data', async () => {
    const mockUser = { id: 'user-456', email: 'newuser@example.com' };
    
    const minimalProfile = {
      id: 'user-456',
      username: null,
      first_name: null,
      last_name: null,
      email: 'newuser@example.com',
      created_at: '2024-01-15T00:00:00Z',
    };

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({
        data: minimalProfile,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValueOnce(mockFrom);

    await GET();

    expect(NextResponse.json).toHaveBeenCalledWith(minimalProfile);
  });

  it('queries correct table and columns', async () => {
    const mockUser = { id: 'user-789', email: 'test@test.com' };

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({
        data: {},
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValueOnce(mockFrom);

    await GET();

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockFrom.select).toHaveBeenCalledWith('*');
    expect(mockFrom.eq).toHaveBeenCalledWith('id', mockUser.id);
    expect(mockFrom.maybeSingle).toHaveBeenCalled();
  });
});
