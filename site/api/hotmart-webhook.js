// Recebe o Webhook (Postback) da Hotmart quando uma compra muda de status,
// e libera (ou revoga) o acesso do aluno ao curso correspondente no Supabase.
//
// Configure esta URL no painel da Hotmart em:
//   Produtor > seu produto > Webhook (ou "Ferramentas > Webhook" na conta)
// URL a cadastrar lá: https://SEU-DOMINIO.vercel.app/api/hotmart-webhook
// Eventos a marcar: Compra aprovada, Compra completa, Compra cancelada,
//   Compra reembolsada, Chargeback.
//
// IMPORTANTE — payload real: a Hotmart pode alterar levemente os nomes de campo
// entre versões da API. Na primeira compra de teste, veja os logs desta função
// no painel da Vercel (Deployments > Functions > hotmart-webhook > Logs) e
// ajuste os caminhos abaixo ("data?.buyer?.email" etc.) se algum vier vazio.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

const APPROVED_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const REVOKED_EVENTS = new Set(['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_EXPIRED']);

function verifyToken(req) {
  var expected = process.env.HOTMART_HOTTOK;
  if (!expected) return true; // sem token configurado ainda — não bloqueia, mas fica registrado no log
  var provided = req.headers['x-hotmart-hottok'] || req.body?.hottok || req.query?.hottok;
  return provided === expected;
}

function extractPurchaseInfo(body) {
  var data = body?.data || body;
  var buyerEmail = data?.buyer?.email || data?.purchase?.buyer?.email || data?.buyer_email || '';
  var buyerName = data?.buyer?.name || data?.purchase?.buyer?.name || '';
  var productId = String(
    data?.product?.id || data?.purchase?.product?.id || data?.product_id || ''
  );
  var transaction = data?.purchase?.transaction || data?.transaction || '';
  return { buyerEmail: buyerEmail.toLowerCase().trim(), buyerName: buyerName, productId: productId, transaction: transaction };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!verifyToken(req)) {
    console.warn('[hotmart-webhook] token inválido ou ausente');
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  var event = req.body?.event || req.body?.status || 'UNKNOWN';
  var info = extractPurchaseInfo(req.body);

  console.log('[hotmart-webhook] evento recebido:', event, JSON.stringify(info));

  if (!info.buyerEmail || !info.productId) {
    console.error('[hotmart-webhook] payload sem email ou product id — payload completo:', JSON.stringify(req.body));
    res.status(200).json({ ok: true, warning: 'missing buyer email or product id, nothing done' });
    return;
  }

  try {
    var supabase = getSupabaseAdmin();

    var { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('hotmart_product_id', info.productId)
      .maybeSingle();

    if (courseError) throw courseError;

    if (!course) {
      console.warn('[hotmart-webhook] nenhum curso cadastrado com hotmart_product_id =', info.productId);
      res.status(200).json({ ok: true, warning: 'no course mapped to this hotmart product id' });
      return;
    }

    if (APPROVED_EVENTS.has(event)) {
      var { data: existingUser } = await supabase.auth.admin.listUsers();
      var user = (existingUser?.users || []).find(function (u) { return u.email === info.buyerEmail; });

      await supabase.from('enrollments').upsert(
        {
          user_id: user ? user.id : null,
          course_id: course.id,
          email: info.buyerEmail,
          status: 'active',
          source: 'hotmart',
          hotmart_transaction: info.transaction
        },
        { onConflict: 'email,course_id' }
      );

      console.log('[hotmart-webhook] acesso liberado para', info.buyerEmail, 'no curso', course.id);
    } else if (REVOKED_EVENTS.has(event)) {
      await supabase
        .from('enrollments')
        .update({ status: 'revoked' })
        .eq('email', info.buyerEmail)
        .eq('course_id', course.id);

      console.log('[hotmart-webhook] acesso revogado para', info.buyerEmail, 'no curso', course.id);
    } else {
      console.log('[hotmart-webhook] evento não tratado:', event);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[hotmart-webhook] erro:', err.message);
    res.status(500).json({ error: 'internal error' });
  }
};
