-- Add caption column to photos table
alter table photos add column if not exists caption text;
