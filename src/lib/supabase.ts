import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kowymzmrtowdesokhbcv.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd3ltem1ydG93ZGVzb2toYmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYzOTU2OCwiZXhwIjoyMTAwMjE1NTY4fQ.MHCzWXpAv8Kcl-wCD5kc-Vfx274qOg-G0GU3_J8ejfw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
