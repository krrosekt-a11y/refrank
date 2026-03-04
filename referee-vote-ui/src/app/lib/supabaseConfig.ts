import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://fndcrryjtnkxcvbduqzv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZGNycnlqdG5reGN2YmR1cXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTk4NDcsImV4cCI6MjA4ODE3NTg0N30.EZTWaK4lFSbtRBHiFHGl_F5Sz09X1OXNEFN5yXyHPcc";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
