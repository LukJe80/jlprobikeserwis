// panel/supabaseClient.js

const SUPABASE_URL = 'https://TWOJ_PROJECT_ID.supabase.co'
const SUPABASE_ANON_KEY = 'TWOJ_ANON_KEY'

// ⛔️ NIE UŻYWAMY nazwy "supabase"
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
