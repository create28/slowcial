-- Add metadata columns to photos table
alter table photos add column if not exists date_taken timestamp with time zone;
alter table photos add column if not exists shutter_speed text;
alter table photos add column if not exists aperture text;
alter table photos add column if not exists iso text;
