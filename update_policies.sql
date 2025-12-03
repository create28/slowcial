-- Allow public access to update photos (required for saving captions)
create policy "Anyone can update photos"
  on photos for update
  using ( true )
  with check ( true );
