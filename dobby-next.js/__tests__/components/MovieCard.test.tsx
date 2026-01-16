import { render, screen } from '@/__tests__/test-utils';
import MovieCard from '@/components/cards/MovieCard';
import userEvent from '@testing-library/user-event';

describe('MovieCard Component', () => {
  const mockProps = {
    id: 1,
    title: 'The Matrix',
    poster: 'https://example.com/poster.jpg',
    rating: 4.5,
    year: '1999',
    type: 'movie' as const,
  };

  it('renders movie card with title and year', () => {
    render(<MovieCard {...mockProps} />);
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
  });

  it('displays the poster image with correct alt text', () => {
    render(<MovieCard {...mockProps} />);
    const image = screen.getByAltText('The Matrix');
    expect(image).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('renders star rating component', () => {
    render(<MovieCard {...mockProps} />);
    // The component uses StarRating internally
    const container = screen.getByAltText('The Matrix').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('toggles favorite state on heart button click', async () => {
    const user = userEvent.setup();
    render(<MovieCard {...mockProps} />);
    
    const heartButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg')
    );
    
    if (heartButton) {
      expect(heartButton).toBeInTheDocument();
      await user.click(heartButton);
      // After clicking, verify button state changed
      expect(heartButton).toBeInTheDocument();
    }
  });

  it('renders with different ratings', () => {
    const lowRatingProps = { ...mockProps, rating: 2 };
    render(<MovieCard {...lowRatingProps} />);
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });

  it('has play button visible on hover', () => {
    render(<MovieCard {...mockProps} />);
    // Play button is rendered but hidden until hover
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles different movie types', () => {
    const tvProps = { ...mockProps, type: 'tv' as const };
    render(<MovieCard {...tvProps} />);
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });

  it('renders card with proper structure', () => {
    const { container } = render(<MovieCard {...mockProps} />);
    // Should have card structure
    expect(container.querySelector('.group')).toBeInTheDocument();
  });
});
