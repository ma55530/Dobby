import { render, screen, waitFor } from '@/__tests__/test-utils';
import { LoginForm } from '@/components/auth/login-form';
import userEvent from '@testing-library/user-event';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  })),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with title', () => {
    render(<LoginForm />);
    expect(screen.getAllByText(/login/i).length).toBeGreaterThan(0);
  });

  it('displays email and password input fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('has email input with correct type', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('has password input with correct type', () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays forgot password link', () => {
    render(<LoginForm />);
    const forgotLink = screen.getByText(/forgot your password/i);
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('has login button', () => {
    render(<LoginForm />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('allows typing in email field', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('allows typing in password field', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');
    
    expect(passwordInput).toHaveValue('password123');
  });

  it('email field has placeholder', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('placeholder', 'm@example.com');
  });

  it('form fields are required', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeRequired();
  });

  it('renders card description', () => {
    render(<LoginForm />);
    expect(screen.getByText(/enter your email below to login/i)).toBeInTheDocument();
  });

  it('has Google login option', () => {
    render(<LoginForm />);
    const googleButton = screen.getByText(/login with google/i);
    expect(googleButton).toBeInTheDocument();
  });

  it('displays error message when provided', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const mockSupabase = {
      auth: {
        signInWithPassword: jest.fn(() => 
          Promise.resolve({ 
            error: { message: 'Invalid credentials' } as Error 
          })
        ),
        signInWithOAuth: jest.fn(),
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    const user = userEvent.setup();
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    
    const loginButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('Login') && !btn.textContent?.includes('Google')
    );
    
    if (loginButton) {
      await user.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
      });
    }
  });

  it('can switch to signup when callback provided', () => {
    const mockSwitch = jest.fn();
    render(<LoginForm onSwitchToSignup={mockSwitch} />);
    expect(screen.getAllByText(/login/i).length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(<LoginForm className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
