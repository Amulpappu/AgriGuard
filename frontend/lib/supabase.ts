import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://todwosflbwzuizvedouy.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZHdvc2ZsYnd6dWl6dmVkb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjYxNjUsImV4cCI6MjEwNjcwMjE2NX0.fDqNi4bHJo9DCByVmZyX_GbKtyvJzQdD_bttu057UKY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_PROJECT_REF = "todwosflbwzuizvedouy";
export const SUPABASE_PROJECT_URL = "https://todwosflbwzuizvedouy.supabase.co";
