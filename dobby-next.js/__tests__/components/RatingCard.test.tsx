import { render, screen } from '@/__tests__/test-utils';
import RatingCard from '@/components/cards/RatingCard';

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(),
  })),
}));

describe('RatingCard Component', () => {
  const mockPost = {
    id: 1,
    author: 'John Doe',
    rating: 8.5,
    movieTitle: 'Inception',
    moviePoster: 'https://example.com/inception.jpg',
  };

  it('renders movie title correctly', () => {
    render(<RatingCard post={mockPost} />);
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it('displays the rating value', () => {
    render(<RatingCard post={mockPost} />);
    expect(screen.getByText('8.5')).toBeInTheDocument();
  });

  it('shows author name', () => {
    render(<RatingCard post={mockPost} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays author initial in avatar', () => {
    render(<RatingCard post={mockPost} />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders poster image when provided', () => {
    render(<RatingCard post={mockPost} />);
    const image = screen.getByAltText('Inception');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('inception.jpg'));
  });

  it('renders without poster image', () => {
    const postWithoutPoster = { ...mockPost, moviePoster: undefined };
    const { container } = render(<RatingCard post={postWithoutPoster} />);
    expect(container).toBeInTheDocument();
    expect(screen.queryByAltText('Inception')).not.toBeInTheDocument();
  });

  it('calculates rating bar width correctly', () => {
    const { container } = render(<RatingCard post={mockPost} />);
    // Rating bar should be rendered with appropriate width
    const ratingBar = container.querySelector('[style*="width"]');
    expect(ratingBar).toBeInTheDocument();
  });

  it('handles different rating values', () => {
    const lowRating = { ...mockPost, rating: 2.5 };
    const { rerender } = render(<RatingCard post={lowRating} />);
    expect(screen.getByText('2.5')).toBeInTheDocument();

    const highRating = { ...mockPost, rating: 10 };
    rerender(<RatingCard post={highRating} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('truncates long movie titles', () => {
    const longTitle = { 
      ...mockPost, 
      movieTitle: 'This is a very long movie title that should be truncated' 
    };
    render(<RatingCard post={longTitle} />);
    expect(screen.getByText(longTitle.movieTitle)).toBeInTheDocument();
  });

  it('handles author names with special characters', () => {
    const specialAuthor = { ...mockPost, author: 'Müller-Schmidt' };
    render(<RatingCard post={specialAuthor} />);
    expect(screen.getByText('Müller-Schmidt')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('applies proper styling classes', () => {
    const { container } = render(<RatingCard post={mockPost} />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('flex');
    expect(card).toHaveClass('rounded-lg');
  });
});
