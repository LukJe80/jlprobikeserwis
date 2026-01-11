// Supabase CDN (global)
const SUPABASE_URL = "https://mzgxvlltlcrvzntswzql.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_ui6ZP_f82VIOpc45esvj4A_fhWmi9Nr";

// Tworzymy globalny klient
window.supabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
