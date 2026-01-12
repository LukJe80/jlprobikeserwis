// panel/supabaseClient.js

const SUPABASE_URL = 'https://mzgvxlltlcrvzmtswzql.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u6iZP_f82VIoPc450syj4A_fhWmi9Nr'

// ⛔️ NIE UŻYWAMY nazwy "supabase"
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
