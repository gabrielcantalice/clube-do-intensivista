(function (global) {
  var STORAGE_KEY = 'ci_site_data_v1';
  var PROGRESS_KEY = 'ci_progress_v1';

  function seedData() {
    return {
      settings: {
        heroTitle: 'Conhecimento que transforma a prática na UTI.',
        heroSubtitle: 'Conteúdos, cursos e capacitações para profissionais e estudantes que querem aprimorar sua atuação em terapia intensiva e emergência.',
        whatsapp: '5500000000000',
        instagram: '@clubedointensivista',
        email: 'contato@clubedointensivista.com.br'
      },
      courses: [
        {
          id: 'vm',
          title: 'Ventilação Mecânica na Prática',
          modality: 'Presencial',
          lessons: [
            { id: 'vm-1', title: 'Fisiologia respiratória aplicada', duration: '45 min' },
            { id: 'vm-2', title: 'Modos ventilatórios e programação inicial', duration: '52 min' },
            { id: 'vm-3', title: 'Desmame ventilatório e extubação segura', duration: '38 min' }
          ]
        },
        {
          id: 'us',
          title: 'Ultrassonografia à Beira-Leito',
          modality: 'Presencial',
          lessons: [
            { id: 'us-1', title: 'Princípios físicos e manuseio do aparelho', duration: '40 min' },
            { id: 'us-2', title: 'Ultrassom pulmonar na prática', duration: '55 min' }
          ]
        },
        {
          id: 'gaso',
          title: 'Gasometria Arterial Descomplicada',
          modality: 'Online',
          lessons: [
            { id: 'gaso-1', title: 'Introdução ao equilíbrio ácido-base', duration: '30 min' },
            { id: 'gaso-2', title: 'Interpretação passo a passo', duration: '41 min' }
          ]
        }
      ],
      materials: [
        { id: 'mat-1', title: 'Guia de Gasometria Arterial', type: 'E-book', free: true },
        { id: 'mat-2', title: 'Protocolo de Sepse', type: 'Protocolo', free: true },
        { id: 'mat-3', title: 'Desmame Ventilatório', type: 'Apostila', free: true },
        { id: 'mat-4', title: 'Hemodinâmica na Prática', type: 'Aula gravada', free: true }
      ],
      events: [
        { id: 'ev-1', date: '2026-09-16', title: 'Live: Doação de Órgãos na UTI', type: 'Live gratuita' },
        { id: 'ev-2', date: '2026-09-27', title: 'Curso de Ultrassonografia à Beira-Leito', type: 'Curso presencial' },
        { id: 'ev-3', date: '2026-10-04', title: 'Curso de Ventilação Mecânica na Prática', type: 'Curso presencial' },
        { id: 'ev-4', date: '2026-10-18', title: 'Curso de Acesso Venoso Guiado por Imagem', type: 'Curso presencial' }
      ],
      announcements: [
        { id: 'an-1', date: '2026-08-20', text: 'Novo módulo de casos clínicos disponível na área Na Prática.' },
        { id: 'an-2', date: '2026-08-10', text: 'Abertas as inscrições gratuitas para a turma de outubro.' }
      ],
      members: [
        { id: 'mb-1', name: 'Rodrigo S.', profession: 'Fisioterapeuta Intensivista', xp: 820, courses: 3 },
        { id: 'mb-2', name: 'Camila M.', profession: 'Enfermeira, UTI Adulto', xp: 640, courses: 2 },
        { id: 'mb-3', name: 'Juliana T.', profession: 'Estudante de Fisioterapia', xp: 310, courses: 2 },
        { id: 'mb-4', name: 'Marcos A.', profession: 'Fisioterapeuta', xp: 180, courses: 1 },
        { id: 'mb-5', name: 'Beatriz L.', profession: 'Enfermeira', xp: 95, courses: 1 },
        { id: 'mb-6', name: 'Pedro H.', profession: 'Estudante de Fisioterapia', xp: 40, courses: 1 }
      ]
    };
  }

  // IDs that ship with the demo seed — used by the public pages to tell "original"
  // content apart from courses/materials/events an admin created, so the new ones
  // can be appended to the live site automatically.
  var SEED_IDS = {
    courses: ['vm', 'us', 'gaso'],
    materials: ['mat-1', 'mat-2', 'mat-3', 'mat-4'],
    events: ['ev-1', 'ev-2', 'ev-3', 'ev-4']
  };

  var LEVELS = [
    { min: 0, title: 'Aluno(a) Iniciante' },
    { min: 100, title: 'Aluno(a) Dedicado(a)' },
    { min: 250, title: 'Praticante Clínico(a)' },
    { min: 500, title: 'Intensivista em Formação' },
    { min: 1000, title: 'Referência da Turma' },
    { min: 2000, title: 'Mentor(a) do Clube' }
  ];

  function levelForXp(xp) {
    var index = 0;
    for (var i = 0; i < LEVELS.length; i++) { if (xp >= LEVELS[i].min) index = i; }
    return { index: index, title: LEVELS[index].title, xp: xp };
  }

  // Computes XP from course progress (courses/lessons + a lessonId->done map,
  // both now sourced from Supabase) plus forum activity (still local).
  // Passing courses/progress explicitly keeps this usable from any page
  // regardless of where that data came from.
  function computeMyStats(courses, progressMap) {
    progressMap = progressMap || loadProgress();
    var forum = [];
    try { forum = JSON.parse(localStorage.getItem('ci_forum_v1')) || []; } catch (e) { forum = []; }

    var watched = 0, completedCourses = 0;
    (courses || []).forEach(function (c) {
      var lessons = c.lessons || [];
      var total = lessons.length;
      var done = lessons.filter(function (l) { return progressMap[l.id]; }).length;
      watched += done;
      if (total > 0 && done === total) completedCourses++;
    });
    var myQuestions = forum.filter(function (t) { return t.authorIsMe; }).length;
    var myAnswers = 0;
    forum.forEach(function (t) { (t.answers || []).forEach(function (a) { if (a.authorIsMe) myAnswers++; }); });

    var xp = watched * 10 + completedCourses * 50 + myQuestions * 5 + myAnswers * 20;
    return { watched: watched, completedCourses: completedCourses, myQuestions: myQuestions, myAnswers: myAnswers, xp: xp };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var seeded = seedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      var parsed = JSON.parse(raw);
      // Backfill any top-level keys missing from data saved before a schema change
      // (e.g. "members" added later) so older browser state keeps working.
      var fresh = seedData();
      var changed = false;
      Object.keys(fresh).forEach(function (key) {
        if (parsed[key] === undefined) { parsed[key] = fresh[key]; changed = true; }
      });
      if (changed) save(parsed);
      return parsed;
    } catch (e) {
      return seedData();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  global.CIStore = {
    load: load,
    save: save,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    uid: uid,
    SEED_IDS: SEED_IDS,
    LEVELS: LEVELS,
    levelForXp: levelForXp,
    computeMyStats: computeMyStats,
    reset: function () {
      var seeded = seedData();
      save(seeded);
      return seeded;
    }
  };
})(window);
