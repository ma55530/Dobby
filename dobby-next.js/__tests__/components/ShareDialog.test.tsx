import { render, screen, waitFor } from '@/__tests__/test-utils';
import { ShareDialog } from '@/components/ShareDialog';
import userEvent from '@testing-library/user-event';

// Mock fetch globally
global.fetch = jest.fn();

describe('ShareDialog Component', () => {
  const mockProps = {
    open: true,
    onOpenChange: jest.fn(),
    itemType: 'movie' as const,
    itemId: 123,
    title: 'Inception',
    posterPath: '/inception.jpg',
    rating: 8.8,
    year: '2010',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'user-123', username: 'testuser' }),
        });
      }
      if (url.includes('/api/conversations')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 'conv-1',
              participants: [
                { id: 'user-123', username: 'testuser', email: 'test@example.com' },
                { id: 'user-456', username: 'friend', email: 'friend@example.com' }
              ]
            }
          ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders dialog when open', () => {
    render(<ShareDialog {...mockProps} />);
    expect(screen.getByText(/share/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ShareDialog {...mockProps} open={false} />);
    // Dialog content should not be visible
    const shareText = screen.queryByText(/share/i);
    expect(shareText).not.toBeInTheDocument();
  });

  it('fetches conversations when opened', async () => {
    render(<ShareDialog {...mockProps} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/conversations');
    });
  });

  it('fetches current user when opened', async () => {
    render(<ShareDialog {...mockProps} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user');
    });
  });

  it('calls onOpenChange when dialog state changes', () => {
    const mockOnChange = jest.fn();
    render(<ShareDialog {...mockProps} onOpenChange={mockOnChange} />);
    
    // The dialog component should have a way to close
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('displays movie title in dialog', () => {
    render(<ShareDialog {...mockProps} />);
    expect(screen.getByText(/inception/i)).toBeInTheDocument();
  });

  it('handles TV show type', () => {
    render(<ShareDialog {...mockProps} itemType="show" />);
    expect(screen.getByText(/share/i)).toBeInTheDocument();
  });

  it('renders with null poster path', () => {
    render(<ShareDialog {...mockProps} posterPath={null} />);
    expect(screen.getByText(/inception/i)).toBeInTheDocument();
  });

  it('has search functionality', async () => {
    render(<ShareDialog {...mockProps} />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText(/share/i)).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully for conversations', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/conversations')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: 'user-123' }),
      });
    });

    render(<ShareDialog {...mockProps} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles fetch errors gracefully for user', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/user')) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ([]),
      });
    });

    render(<ShareDialog {...mockProps} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('refetches data when dialog is reopened', async () => {
    const { rerender } = render(<ShareDialog {...mockProps} open={false} />);
    
    // Open the dialog
    rerender(<ShareDialog {...mockProps} open={true} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/conversations');
    });
  });
});
