import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hmewaqakudjzhnxavyoj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZXdhcWFrdWRqemhueGF2eW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODU2MjgsImV4cCI6MjA5MjQ2MTYyOH0.WAJlNcJAyS5eYfF1Kz26Hoh4rojR5W8VfmjUYkFM4lA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
