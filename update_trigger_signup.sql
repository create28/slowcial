-- Refine the handle_new_user function to respect explicit username
create or replace function public.handle_new_user()
returns trigger as $$
declare
  -- Try to get username from metadata, default to part of email
  _username text := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
begin
  -- Ensure username is at least unique-ish or handle potential conflict? 
  -- Ideally the 'username text unique' constraint will catch duplicates and fail the insert, 
  -- rolling back the signup. This is good behavior.
  
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    _username
  );
  return new;
end;
$$ language plpgsql security definer;
