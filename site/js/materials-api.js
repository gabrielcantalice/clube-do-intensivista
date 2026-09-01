// Materiais (Biblioteca do Intensivista) — Supabase, com arquivo real pra
// baixar ou link externo, em vez de cards decorativos sem função.
window.MaterialsAPI = (function () {
  function sb() { return window.getSupabaseClient(); }

  async function loadAllMaterials() {
    var { data, error } = await sb().from('materials').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function createMaterial(material) {
    var { data, error } = await sb().from('materials').insert(material).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteMaterial(id) {
    var { error } = await sb().from('materials').delete().eq('id', id);
    if (error) throw error;
  }

  return {
    loadAllMaterials: loadAllMaterials,
    createMaterial: createMaterial,
    deleteMaterial: deleteMaterial
  };
})();
