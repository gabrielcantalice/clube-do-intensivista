// Configuração pública do Supabase para o navegador.
// A "anon key" é feita para ser pública (o acesso real é controlado pelas
// regras de RLS no banco) — só a "service_role" (usada em site/lib/supabaseAdmin.js)
// é secreta e nunca deve aparecer aqui.
window.SUPABASE_URL = 'https://kdlwalxyskzdzixlguzb.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbHdhbHh5c2t6ZHppeGxndXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjM2MTIsImV4cCI6MjEwMzQ5OTYxMn0.SeZKJkPHGVuuq6Ievn5q40cjSNjwdlPLrrVeiqdZVtA';

window.getSupabaseClient = function () {
  if (window.__supabaseClient) return window.__supabaseClient;
  window.__supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return window.__supabaseClient;
};
