'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GoogleLogo } from '../icons/google-logo'

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  onSwitchToSignup?: () => void;
}

export function LoginForm({ className, onSwitchToSignup, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLoginWithGoogle = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push('/')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-2xl text-white">Login</CardTitle>
          <CardDescription className="text-white">Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6 text-white">
              <div className="grid gap-2 text-white">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center text-white">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline font-semibold text-white-400 hover:text-purple-300"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-purple-950 hover:bg-purple-400 text-white" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-900 hover:text-white border-transparent font-medium"
                onClick={handleLoginWithGoogle}
                disabled={isLoading}
              >
                <GoogleLogo className="w-5 h-5" />
                Login with Google
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-white">
              Don&apos;t have an account?{' '}
              {onSwitchToSignup ? (
                <button type="button" onClick={onSwitchToSignup} className="underline underline-offset-4 font-semibold text-white hover:text-purple-300">
                  Sign up
                </button>
              ) : (
                <Link href="/auth/sign-up" className="underline underline-offset-4 font-semibold text-white hover:text-purple-300">
                  Sign up
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
