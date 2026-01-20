import { render, screen } from '@/__tests__/test-utils';
import Footer from '@/components/Footer';

describe('Footer Component', () => {
  it('renders footer element', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('displays copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2025 Dobby/i)).toBeInTheDocument();
  });

  it('displays tagline', () => {
    render(<Footer />);
    expect(screen.getByText(/your social network for cinema/i)).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('py-6');
    expect(footer).toHaveClass('text-center');
  });

  it('renders complete copyright message', () => {
    render(<Footer />);
    expect(screen.getByText('© 2025 Dobby. Your social network for cinema.')).toBeInTheDocument();
  });

  it('is a footer semantic element', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('centers text content', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('text-center');
  });

  it('has full width', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('w-full');
  });
});
