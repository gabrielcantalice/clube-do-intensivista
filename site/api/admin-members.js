// Gerencia membros a pedido do painel administrativo: criar conta com senha
// temporária (sem depender do envio de e-mail do Supabase), promover/rebaixar
// (aluno <-> admin), redefinir senha e remover conta.
// Só quem já é admin (conferido pelo token da própria sessão) pode chamar isso —
// por isso usa a service_role key, que nunca é exposta ao navegador.

const crypto = require('crypto');
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

function generatePassword() {
  // 12 caracteres, fácil de ler e copiar, sem ambiguidade (sem 0/O, 1/l/I).
  var chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  var out = '';
  var bytes = crypto.randomBytes(12);
  for (var i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function requireAdmin(req, supabase) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  var { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  var { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') return null;

  return userData.user;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  var caller = await requireAdmin(req, supabase);
  if (!caller) {
    res.status(403).json({ error: 'Apenas administradores podem gerenciar membros.' });
    return;
  }

  var body = req.body || {};
  var action = body.action;

  try {
    if (action === 'invite') {
      var email = (body.email || '').trim().toLowerCase();
      var fullName = (body.fullName || '').trim();
      var profession = (body.profession || '').trim();
      var role = body.role === 'admin' ? 'admin' : 'aluno';
      if (!email) { res.status(400).json({ error: 'E-mail é obrigatório.' }); return; }

      var tempPassword = generatePassword();

      var { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true, // já entra confirmado — não depende do e-mail do Supabase
        user_metadata: { full_name: fullName, profession: profession }
      });
      if (createErr) { res.status(400).json({ error: createErr.message }); return; }

      if (role === 'admin') {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', created.user.id);
      }

      res.status(200).json({ ok: true, userId: created.user.id, tempPassword: tempPassword });
      return;
    }

    if (action === 'resetPassword') {
      var resetId = body.userId;
      if (!resetId) { res.status(400).json({ error: 'userId é obrigatório.' }); return; }
      var newTempPassword = generatePassword();
      var { error: resetErr } = await supabase.auth.admin.updateUserById(resetId, { password: newTempPassword });
      if (resetErr) { res.status(400).json({ error: resetErr.message }); return; }
      res.status(200).json({ ok: true, tempPassword: newTempPassword });
      return;
    }

    if (action === 'setRole') {
      var targetId = body.userId;
      var newRole = body.role === 'admin' ? 'admin' : 'aluno';
      if (!targetId) { res.status(400).json({ error: 'userId é obrigatório.' }); return; }
      if (targetId === caller.id && newRole !== 'admin') {
        res.status(400).json({ error: 'Você não pode remover seu próprio acesso de admin por aqui.' });
        return;
      }
      var { error: roleErr } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetId);
      if (roleErr) { res.status(400).json({ error: roleErr.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'remove') {
      var removeId = body.userId;
      if (!removeId) { res.status(400).json({ error: 'userId é obrigatório.' }); return; }
      if (removeId === caller.id) { res.status(400).json({ error: 'Você não pode remover a própria conta por aqui.' }); return; }
      var { error: delErr } = await supabase.auth.admin.deleteUser(removeId);
      if (delErr) { res.status(400).json({ error: delErr.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[admin-members] erro:', err.message);
    res.status(500).json({ error: 'internal error' });
  }
};
