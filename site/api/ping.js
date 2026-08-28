// Endpoint simples para conferir se o deploy na Vercel está no ar e se as
// variáveis de ambiente foram configuradas — sem expor nenhum valor secreto.
// Teste abrindo https://SEU-DOMINIO.vercel.app/api/ping no navegador.
module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      HOTMART_HOTTOK: Boolean(process.env.HOTMART_HOTTOK)
    }
  });
};
