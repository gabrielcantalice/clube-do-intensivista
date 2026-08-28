// Cursos, aulas, matrículas e progresso agora vivem no Supabase (não mais no
// localStorage) — é o que permite cada aluno ver só o que tem acesso, em
// qualquer dispositivo. Este arquivo concentra essas chamadas para não
// duplicar em admin.html / area-aluno.html / cursos.html.
window.CoursesAPI = (function () {
  function sb() { return window.getSupabaseClient(); }

  async function loadAllCourses() {
    var { data, error } = await sb().from('courses').select('*, lessons(*)').order('created_at', { ascending: true });
    if (error) throw error;
    (data || []).forEach(function (c) { c.lessons = (c.lessons || []).sort(function (a, b) { return a.position - b.position || a.created_at.localeCompare(b.created_at); }); });
    return data || [];
  }

  async function createCourse(course) {
    var { data, error } = await sb().from('courses').insert(course).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteCourse(id) {
    var { error } = await sb().from('courses').delete().eq('id', id);
    if (error) throw error;
  }

  async function addLesson(courseId, lesson) {
    lesson.course_id = courseId;
    var { data, error } = await sb().from('lessons').insert(lesson).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteLesson(id) {
    var { error } = await sb().from('lessons').delete().eq('id', id);
    if (error) throw error;
  }

  async function loadEnrollmentsForUser(userId) {
    var { data, error } = await sb().from('enrollments').select('course_id, status').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  }

  async function loadEnrollmentsForCourse(courseId) {
    var { data, error } = await sb().from('enrollments').select('*').eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  }

  async function setEnrollment(email, userId, courseId, active) {
    var { error } = await sb().from('enrollments').upsert({
      email: email, user_id: userId, course_id: courseId,
      status: active ? 'active' : 'revoked', source: 'manual'
    }, { onConflict: 'email,course_id' });
    if (error) throw error;
  }

  async function loadProgress(userId) {
    var { data, error } = await sb().from('lesson_progress').select('lesson_id').eq('user_id', userId);
    if (error) throw error;
    var set = {};
    (data || []).forEach(function (r) { set[r.lesson_id] = true; });
    return set;
  }

  async function setLessonDone(userId, lessonId, done) {
    if (done) {
      var { error } = await sb().from('lesson_progress').upsert({ user_id: userId, lesson_id: lessonId });
      if (error) throw error;
    } else {
      var res = await sb().from('lesson_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId);
      if (res.error) throw res.error;
    }
  }

  // Um curso é visível ao aluno se for gratuito (sem link externo) ou se
  // ele tiver uma matrícula ativa (comprada na Hotmart ou liberada manualmente).
  function coursesVisibleTo(allCourses, enrollments) {
    var activeIds = {};
    enrollments.forEach(function (e) { if (e.status === 'active') activeIds[e.course_id] = true; });
    return allCourses.filter(function (c) { return !c.external_link || activeIds[c.id]; });
  }

  return {
    loadAllCourses: loadAllCourses,
    createCourse: createCourse,
    deleteCourse: deleteCourse,
    addLesson: addLesson,
    deleteLesson: deleteLesson,
    loadEnrollmentsForUser: loadEnrollmentsForUser,
    loadEnrollmentsForCourse: loadEnrollmentsForCourse,
    setEnrollment: setEnrollment,
    loadProgress: loadProgress,
    setLessonDone: setLessonDone,
    coursesVisibleTo: coursesVisibleTo
  };
})();
