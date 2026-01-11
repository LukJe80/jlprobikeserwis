// globalny klient Supabase
const SUPABASE_URL = "https://mzgxvlltcrvzmtswzql.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_u6iZP_f82V0pC45osjv4A_fhWm19Nr";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
