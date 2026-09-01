(function (global) {
  var STORAGE_KEY = 'ci_site_data_v1';
  var PROGRESS_KEY = 'ci_progress_v1';

  function seedData() {
    return {
      settings: {
        heroTitle: 'Conhecimento que transforma a prática na UTI.',
        heroSubtitle: 'Conteúdos, cursos e capacitações para profissionais e estudantes que querem aprimorar sua atuação em terapia intensiva e emergência.',
        whatsapp: '5583988672657',
        instagram: '@clubedointensivista',
        email: 'clubedointensivismo@gmail.com'
      },
      courses: [],
      materials: [],
      events: [],
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
    courses: [],
    materials: [],
    events: []
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
