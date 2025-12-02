// Supabase Configuration
// TODO: Replace these values with your own from the Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://hiibyncwpzsclwlehfgs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWJ5bmN3cHpzY2x3bGVoZmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTA2MzMsImV4cCI6MjA4MDI4NjYzM30.L4zOioOCUftL71IicfSIgEk7W9ThwqNkbEf48TRCHd4';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
