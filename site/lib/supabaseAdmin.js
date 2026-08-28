// Server-side only Supabase client. Uses the SERVICE ROLE key, which bypasses
// Row Level Security — this file must never be imported by anything that runs
// in the browser, and SUPABASE_SERVICE_ROLE_KEY must never be prefixed with
// NEXT_PUBLIC_ / VITE_ / exposed to client code.
const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas nas variáveis de ambiente.');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

module.exports = { getSupabaseAdmin };
