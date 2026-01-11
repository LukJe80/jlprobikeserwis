const SUPABASE_URL = "https://mzgvlltlcrvzntswzql.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_u6iZP_f82VI0pc45esyj4A_fhWmi9Nr";

window.supabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
