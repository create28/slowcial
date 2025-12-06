-- IMPORTANT: Run this script in the Supabase SQL Editor.
-- It assumes you are running it as the user who owns the existing photos.

-- 1. Assign existing photos to the current user (if they are unassigned)
-- This works best if you have only one main user right now.
-- In Supabase SQL Editor, you might need to hardcode your UUID if auth.uid() is null.
-- To act as a specific user in SQL Editor, you can't easily, so we'll make the column nullable first (done in previous script).

-- PLAN:
-- 1. Run this command manually with your User ID:
-- UPDATE photos SET user_id = 'YOUR_USER_UUID_HERE' WHERE user_id IS NULL;

-- 2. Update RLS Policies to enforce ownership
drop policy if exists "Authenticated Write Access" on photos;
drop policy if exists "Anyone can update photos" on photos;
drop policy if exists "Anyone can delete photos" on photos;
drop policy if exists "Anyone can upload photos" on photos;

-- Allow everyone to see all photos (Global Feed)
create policy "Public Read Access"
on photos for select
using (true);

-- Allow authenticated users to upload photos, automatically assigning their ID
create policy "Authenticated users can upload"
on photos for insert
with check ( auth.role() = 'authenticated' );
-- Note: app.js must send user_id, OR we set default:
-- alter table photos alter column user_id set default auth.uid();

-- Allow users to update ONLY their own photos
create policy "Users can update own photos"
on photos for update
using ( auth.uid() = user_id );

-- Allow users to delete ONLY their own photos
create policy "Users can delete own photos"
on photos for delete
using ( auth.uid() = user_id );
