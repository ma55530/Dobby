create table public.user_genre_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  genre text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, genre)
);

alter table public.user_genre_preferences enable row level security;

create policy "Users can read own preferences"
  on public.user_genre_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_genre_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own preferences"
  on public.user_genre_preferences for delete
  using (auth.uid() = user_id);

create index if not exists idx_user_genre_preferences_user_id on public.user_genre_preferences using btree (user_id);

-- Trigger for updated_at
create trigger trigger_update_user_genre_preferences_updated_at
before update on public.user_genre_preferences
for each row
execute function update_updated_at_column();
