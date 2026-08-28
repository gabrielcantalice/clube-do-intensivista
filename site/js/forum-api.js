// Central de Dúvidas (fórum) e pontos de engajamento — Supabase, não mais
// localStorage. Isso é o que permite um ranking real entre membros de
// verdade, em vez de só o que aparece pro dono do navegador.
window.ForumAPI = (function () {
  function sb() { return window.getSupabaseClient(); }

  async function loadThreads() {
    var { data, error } = await sb()
      .from('forum_threads')
      .select('*, profiles(full_name), forum_answers(*, profiles(full_name, helpful_answers_count))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function createThread(authorId, tag, body) {
    var { data, error } = await sb().from('forum_threads').insert({ author_id: authorId, tag: tag, body: body }).select().single();
    if (error) throw error;
    try { await sb().rpc('add_engagement_points', { amount: 5 }); } catch (e) { /* pontuação é bônus, não bloqueia a publicação */ }
    return data;
  }

  async function createAnswer(threadId, authorId, body) {
    var { data, error } = await sb().from('forum_answers').insert({ thread_id: threadId, author_id: authorId, body: body }).select().single();
    if (error) throw error;
    try { await sb().rpc('add_engagement_points', { amount: 15 }); } catch (e) { /* pontuação é bônus, não bloqueia a resposta */ }
    return data;
  }

  async function recordCaseAnswer(isCorrect) {
    try { await sb().rpc('record_case_answer', { is_correct: isCorrect }); } catch (e) { /* não bloqueia a exibição do feedback do caso */ }
  }

  async function markAnswerHelpful(answerId, isHelpful) {
    var { error } = await sb().rpc('mark_answer_helpful', { p_answer_id: answerId, p_is_helpful: isHelpful });
    if (error) throw error;
  }

  async function loadRanking(limit) {
    var { data, error } = await sb()
      .from('profiles')
      .select('id, full_name, profession, engagement_points, case_best_streak, helpful_answers_count')
      .order('engagement_points', { ascending: false })
      .limit(limit || 20);
    if (error) throw error;
    return data || [];
  }

  return {
    loadThreads: loadThreads,
    createThread: createThread,
    createAnswer: createAnswer,
    recordCaseAnswer: recordCaseAnswer,
    markAnswerHelpful: markAnswerHelpful,
    loadRanking: loadRanking
  };
})();
