-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 3. Handle new user signup automatically
-- Drop existing trigger/function if they exist to avoid duplication errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    split_part(new.email, '@', 1) -- Default username from email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Update photos table to link to users
alter table photos add column if not exists user_id uuid references public.profiles(id);

-- 5. Update RLS for photos (Restrictive)
-- Note: You should run 'migrate_photos.sql' to assign existing photos before enforcing strict RLS if you want to keep them.
