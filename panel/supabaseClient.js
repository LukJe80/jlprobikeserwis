import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://mzgvxlltlcrvzmtswzql.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u6iZP_f82VIoPc450syj4A_fhWmi9Nr";

window.supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
