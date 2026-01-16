import { render, screen } from '@/__tests__/test-utils';
import { LogoutButton } from '@/components/auth/logout-button';
import userEvent from '@testing-library/user-event';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
const mockSignOut = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}));

describe('LogoutButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('renders logout button', () => {
    render(<LogoutButton />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls signOut when clicked', async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /logout/i });
    await user.click(button);
    
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('redirects to login page after logout', async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /logout/i });
    await user.click(button);
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('refreshes router after logout', async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /logout/i });
    await user.click(button);
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('is a button element', () => {
    render(<LogoutButton />);
    const button = screen.getByRole('button', { name: /logout/i });
    expect(button.tagName).toBe('BUTTON');
  });

  it('handles multiple clicks gracefully', async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /logout/i });
    
    // Click multiple times quickly
    await user.click(button);
    await user.click(button);
    
    // Both clicks should trigger signOut
    expect(mockSignOut).toHaveBeenCalled();
  });
});
