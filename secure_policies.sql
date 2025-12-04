-- Drop existing policies to start fresh
drop policy if exists "Public Access" on photos;
drop policy if exists "Anyone can upload photos" on photos;
drop policy if exists "Anyone can delete photos" on photos;
drop policy if exists "Anyone can update photos" on photos;

-- Create secure policies

-- 1. Public Read Access: Anyone can view photos
create policy "Public Read Access"
on photos for select
using (true);

-- 2. Authenticated Write Access: Only logged-in users can Insert, Update, Delete
create policy "Authenticated Write Access"
on photos for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
