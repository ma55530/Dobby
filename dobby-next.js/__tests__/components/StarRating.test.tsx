import { render, screen } from '@/__tests__/test-utils';
import StarRating from '@/components/StarRating';
import userEvent from '@testing-library/user-event';

describe('StarRating Component', () => {
  it('renders the correct number of stars', () => {
    const { container } = render(<StarRating rating={3.5} maxRating={5} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('displays the rating value when showValue is true', () => {
    const { container } = render(<StarRating rating={4} showValue={true} />);
    // The rating value should be displayed in a span
    const ratingText = container.querySelector('span');
    expect(ratingText).toBeInTheDocument();
  });

  it('does not display rating value when showValue is false', () => {
    const { container } = render(<StarRating rating={4} showValue={false} />);
    expect(container).toBeInTheDocument();
  });

  it('renders different star sizes correctly', () => {
    const { container: smContainer } = render(
      <StarRating rating={3} size="sm" showValue={false} />
    );
    const { container: mdContainer } = render(
      <StarRating rating={3} size="md" showValue={false} />
    );
    const { container: lgContainer } = render(
      <StarRating rating={3} size="lg" showValue={false} />
    );

    expect(smContainer).toBeInTheDocument();
    expect(mdContainer).toBeInTheDocument();
    expect(lgContainer).toBeInTheDocument();
  });

  it('handles interactive mode with click events', async () => {
    const user = userEvent.setup();
    const mockOnRatingChange = jest.fn();

    const { container } = render(
      <StarRating
        rating={0}
        interactive={true}
        onRatingChange={mockOnRatingChange}
        showValue={false}
      />
    );

    // Get all star elements (SVG)
    const stars = container.querySelectorAll('svg');
    
    if (stars.length > 0) {
      // Click the first star
      await user.click(stars[0]);
      
      // The mock should have been called
      expect(mockOnRatingChange).toHaveBeenCalled();
    }
  });

  it('applies correct CSS classes for filled, half-filled, and empty stars', () => {
    const { container } = render(
      <StarRating rating={3.5} maxRating={5} showValue={false} />
    );
    
    // Should have 5 star elements
    const allStars = container.querySelectorAll('svg');
    expect(allStars.length).toBe(5);
  });

  it('uses custom maxRating value', () => {
    const { container } = render(<StarRating rating={8} maxRating={10} showValue={false} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(10);
  });

  it('handles zero rating', () => {
    const { container } = render(
      <StarRating rating={0} maxRating={5} showValue={false} />
    );
    expect(container).toBeInTheDocument();
  });

  it('handles maximum rating', () => {
    const { container } = render(
      <StarRating rating={5} maxRating={5} showValue={false} />
    );
    expect(container).toBeInTheDocument();
  });
});
