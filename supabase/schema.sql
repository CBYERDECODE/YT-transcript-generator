-- Run this once in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 1,
  credit_date date not null default current_date,
  created_at timestamptz not null default now()
);
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  title text,
  channel text,
  transcript text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.transcripts enable row level security;
create policy "Users can read their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can read their transcripts" on public.transcripts for select using (auth.uid() = user_id);
create policy "Users can insert their profile" on public.profiles for insert with check (auth.uid() = id);

-- Create a profile automatically for every new user.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict do nothing; return new; end; $$;
create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
