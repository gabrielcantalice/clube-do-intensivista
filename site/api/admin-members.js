// Gerencia membros a pedido do painel administrativo: convidar por e-mail,
// promover/rebaixar (aluno <-> admin) e remover conta.
// Só quem já é admin (conferido pelo token da própria sessão) pode chamar isso —
// por isso usa a service_role key, que nunca é exposta ao navegador.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

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

      var { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, profession: profession }
      });
      if (inviteErr) { res.status(400).json({ error: inviteErr.message }); return; }

      if (role === 'admin') {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', invited.user.id);
      }

      res.status(200).json({ ok: true, userId: invited.user.id });
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
