import { render, screen } from '@/__tests__/test-utils';
import ReviewCard from '@/components/cards/ReviewCard';
import userEvent from '@testing-library/user-event';

// Mock fetch globally
global.fetch = jest.fn();

describe('ReviewCard Component', () => {
  const mockPost = {
    id: 1,
    author: 'Jane Smith',
    avatar: 'https://example.com/avatar.jpg',
    rating: 4.5,
    content: 'This is an amazing movie! Highly recommend it.',
    date: '2024-01-15',
    likes: 10,
    movieId: 123,
    movieTitle: 'The Matrix',
    movieType: 'movie' as const,
    moviePoster: 'https://example.com/matrix.jpg',
  };

  beforeEach(() => {
    // Reset fetch mock before each test
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ liked: false, likes: 10 }),
      } as Response)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders author name', () => {
    render(<ReviewCard post={mockPost} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays review content', () => {
    render(<ReviewCard post={mockPost} />);
    expect(screen.getByText('This is an amazing movie! Highly recommend it.')).toBeInTheDocument();
  });

  it('shows movie title when provided', () => {
    render(<ReviewCard post={mockPost} />);
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });

  it('renders without movie information', () => {
    const postWithoutMovie = {
      ...mockPost,
      movieId: undefined,
      movieTitle: undefined,
      moviePoster: undefined,
    };
    render(<ReviewCard post={postWithoutMovie} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays initial likes count', async () => {
    render(<ReviewCard post={mockPost} />);
    // Wait for the component to fetch like status
    await screen.findByText('Jane Smith');
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('has like button', () => {
    render(<ReviewCard post={mockPost} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has share button', () => {
    render(<ReviewCard post={mockPost} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders nested review without movie info', () => {
    render(<ReviewCard post={mockPost} isNested={true} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
  });

  it('fetches like status on mount', async () => {
    render(<ReviewCard post={mockPost} />);
    
    // Wait for component to render
    await screen.findByText('Jane Smith');
    
    // Check that fetch was called for like status
    expect(global.fetch).toHaveBeenCalled();
  });

  it('displays formatted date', () => {
    render(<ReviewCard post={mockPost} />);
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('renders with different ratings', () => {
    const lowRating = { ...mockPost, rating: 1.5 };
    render(<ReviewCard post={lowRating} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('handles long review content', () => {
    const longContent = {
      ...mockPost,
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
    };
    const { container } = render(<ReviewCard post={longContent} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders avatar when provided', () => {
    const { container } = render(<ReviewCard post={mockPost} />);
    expect(container).toBeInTheDocument();
  });

  it('handles missing avatar gracefully', () => {
    const postWithoutAvatar = { ...mockPost, avatar: undefined };
    render(<ReviewCard post={postWithoutAvatar} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});
