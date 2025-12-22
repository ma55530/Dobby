export type ThemeVariant = 'light' | 'dark'

export interface UserProfile {
  id: string,
  username: string,
  first_name?: string | null,
  last_name?: string | null,
  email: string,
  age?: number | null,
  avatar_url?: string | null,
  bio?: string | null,
  favorite_genres?: number[] | null,
  theme: ThemeVariant,
  created_at: string,
  updated_at: string
}