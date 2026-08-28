// Eventos e inscrições vivem no Supabase — permite ao admin controlar quem
// está inscrito em cada evento gratuito, de qualquer dispositivo.
window.EventsAPI = (function () {
  function sb() { return window.getSupabaseClient(); }

  async function loadAllEvents() {
    var { data, error } = await sb().from('events').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function createEvent(event) {
    var { data, error } = await sb().from('events').insert(event).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteEvent(id) {
    var { error } = await sb().from('events').delete().eq('id', id);
    if (error) throw error;
  }

  async function loadRegistrationsForEvent(eventId) {
    var { data, error } = await sb().from('event_registrations').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function loadMyRegistrations(userId) {
    var { data, error } = await sb().from('event_registrations').select('event_id').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  }

  async function registerForEvent(eventId, userId, fullName, email) {
    var { error } = await sb().from('event_registrations').insert({
      event_id: eventId, user_id: userId, full_name: fullName || '', email: email || ''
    });
    if (error) throw error;
  }

  async function cancelRegistration(eventId, userId) {
    var { error } = await sb().from('event_registrations').delete().eq('event_id', eventId).eq('user_id', userId);
    if (error) throw error;
  }

  async function removeRegistration(registrationId) {
    var { error } = await sb().from('event_registrations').delete().eq('id', registrationId);
    if (error) throw error;
  }

  return {
    loadAllEvents: loadAllEvents,
    createEvent: createEvent,
    deleteEvent: deleteEvent,
    loadRegistrationsForEvent: loadRegistrationsForEvent,
    loadMyRegistrations: loadMyRegistrations,
    registerForEvent: registerForEvent,
    cancelRegistration: cancelRegistration,
    removeRegistration: removeRegistration
  };
})();
