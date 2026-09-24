import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'es' | 'en';

// Diccionario de la interfaz (navegación, encabezados, botones, estados
// vacíos). El contenido que escribe el admin (itinerario, lugares,
// sugerencias, avisos) se queda tal como lo redactó — traducir texto
// libre escrito por personas requeriría guardar dos versiones de cada
// campo (un cambio de esquema mucho más grande) o traducción automática
// en vivo (poco confiable). Este diccionario cubre todo lo que es "la
// aplicación hablando", que es lo que un estudiante internacional
// necesita para moverse solo por la app.
const DICT = {
  es: {
    // Navbar
    nav_subtitle: '9–18 oct 2026 · Bogotá y el Caribe',
    nav_theme_dark: 'Cambiar a modo claro',
    nav_theme_light: 'Cambiar a modo oscuro',
    nav_sync: 'Sincronizar cambios en vivo',
    nav_admin_badge: 'admin',
    nav_admin_exit: 'Volver a vista de viajero',
    nav_admin_enter: 'admin',
    nav_admin_enter_prefix: 'Soy',
    nav_change_user: 'Cambiar de apodo o salir',

    // Tabs
    tab_inicio: 'Inicio',
    tab_ruta: 'Ruta',
    tab_lugares: 'Lugares',
    tab_hospedaje: 'Hospedaje',
    tab_transporte: 'Transporte',
    tab_votar: 'Votar',
    tab_ideas: 'Ideas',
    tab_cuentas: 'Cuentas',
    tab_admin: 'Admin',

    // Welcome
    welcome_title_group: 'Bienvenido a la aventura',
    welcome_title_admin: 'Panel del organizador',
    welcome_sub_group: 'Colombia · del 9 al 18 de octubre de 2026',
    welcome_sub_admin: 'Control del itinerario, las ideas del grupo y las encuestas.',
    welcome_name_label: '¿Cómo te quieres llamar en esta aventura?',
    welcome_name_placeholder: 'Tu nombre o apodo',
    welcome_secret_label: '¿Cuál es la palabra secreta para ser parte de esta aventura?',
    welcome_secret_placeholder: 'Pídesela al organizador',
    welcome_avatar_label: 'Elige tu insignia',
    welcome_enter: 'Entrar',
    welcome_entering: 'Entrando...',
    welcome_be_admin: 'Soy el administrador',
    welcome_back_to_group: 'Volver al acceso del grupo',
    welcome_admin_password_label: 'Contraseña de administrador',
    welcome_admin_enter: 'Entrar como admin',
    welcome_admin_entering: 'Verificando...',
    welcome_footer: 'Sin registro ni correos. Tu nombre se recuerda en este navegador.',
    welcome_new_title: '¡Bienvenido a la aventura, {name}!',
    welcome_new_sub: 'Ya puedes sugerir lugares, votar los planes y llevar las cuentas con todos.',
    welcome_back_title: '¡Ya te conocemos, {name}!',
    welcome_back_sub: 'Ese nombre ya estaba registrado — continuamos con tu perfil y tu historial tal como lo dejaste.',

    // Home
    home_notices: 'Avisos del grupo',
    home_notice_placeholder: 'Escribe un aviso para todo el grupo...',
    home_notice_publish: 'Publicar',
    home_notice_empty: 'Sin avisos por ahora.',
    home_today: 'Hoy',
    home_kickoff: 'Arrancamos así',
    home_see_route: 'Ver la ruta completa →',
    home_stat_budget: 'Presupuesto estimado por persona',
    home_stat_budget_action: 'Ver detalle',
    home_stat_polls: 'encuestas abiertas para votar',
    home_stat_polls_action: 'Votar',
    home_stat_suggestions: 'ideas del grupo en revisión',
    home_stat_suggestions_action: 'Sugerir algo',
    home_stat_balance_sub: 'según las cuentas registradas',
    home_stat_balance_action: 'Ver cuentas',
    home_settled: 'Estás a paz y salvo',
    home_countdown_one_day: 'Falta 1 día',
    home_countdown_days: 'Faltan {n} días',
    home_countdown_day_of: 'Día {n} de {total}',
    home_countdown_over: 'La aventura ya pasó',

    // Ruta / ItineraryView
    route_title: 'La ruta, día por día',
    route_lead: 'Toca un día del calendario para ir a su plan.',
    route_total_budget: 'Presupuesto estimado total por persona',
    route_edit_day: 'Editar día',
    route_lodging: 'Hospedaje',
    route_transport: 'Transporte',
    route_day_budget: 'Presupuesto del día',
    route_lodging_fallback: 'Por coordinar',
    route_transport_fallback: 'A pie / local',
    route_plan: 'Plan del día',
    route_propose: 'Proponer algo',
    route_add_activity: 'Agregar actividad',
    route_no_activities: 'No hay actividades registradas aún.',
    route_map_title: 'Ruta en mapa',
    route_map_trip: 'Viaje completo',
    route_map_fullscreen: 'Pantalla completa',
    route_map_places_in: 'lugares en',
    route_map_place: 'lugar',
    route_map_places: 'lugares',
    route_map_add_place: 'Agregar lugar',
    route_map_empty: 'Aún no hay lugares para',

    // Lugares
    places_title: 'Lugares para visitar',
    places_lead: 'Lo que ya está en el plan. ¿Conoces otro sitio? Propónlo y el admin decide.',
    places_suggest: 'Sugerir un lugar',
    places_add: 'Agregar lugar',
    places_all: 'Todas',
    places_view_map: 'Ver en mapa',
    places_remove: 'Quitar',
    places_empty: 'Aún no hay lugares aquí. ¡Sugiere uno!',

    // Hospedaje
    lodging_title: 'Dónde dormimos',
    lodging_lead: 'Los precios marcados como estimados son supuestos hasta que reservemos.',
    lodging_suggest: 'Sugerir hospedaje',
    lodging_add: 'Agregar hospedaje',
    lodging_estimated: 'Precio estimado',
    lodging_confirmed: 'Dato del grupo',
    lodging_per_night: 'por persona / noche',
    lodging_total: 'Total',
    lodging_total_row: 'Hospedaje por persona',
    lodging_empty: 'Todavía no hay hospedajes cargados.',
    lodging_night: 'noche',
    lodging_nights: 'noches',

    // Transporte
    transport_title: 'Cómo nos movemos',
    transport_lead: 'Tramos entre ciudades. Los precios son por persona y pueden cambiar.',
    transport_suggest: 'Sugerir transporte',
    transport_add: 'Agregar tramo',
    transport_per_person: 'por persona',
    transport_total_row: 'Transporte entre ciudades por persona',
    transport_empty: 'Todavía no hay tramos de transporte cargados.',
    transport_note: 'El lunes 12 de octubre es festivo: buses y vuelos se llenan y suben de precio. Conviene comprar con tiempo.',

    // Votar
    polls_title: 'Votaciones',
    polls_lead: 'Elige una opción y listo: tu voto queda contado en el momento.',
    polls_propose: 'Proponer encuesta',
    polls_active: 'Votación activa',
    polls_closed: 'Cerrada',
    polls_pending: 'Pendiente de aprobación',
    polls_empty: 'No hay encuestas todavía.',
    polls_approve: 'Aprobar',
    polls_discard: 'Descartar',
    polls_close: 'Cerrar',
    polls_reopen: 'Reabrir',
    polls_vote: 'Votar',
    polls_proposed_by: 'Propuesta por',

    // Ideas
    ideas_title: 'Ideas del grupo',
    ideas_lead: 'Propón lugares, hospedajes, horarios o lo que creas importante. El admin las revisa y decide qué entra al plan.',
    ideas_propose: 'Proponer una idea',
    ideas_all: 'Todas',
    ideas_pending: 'En revisión',
    ideas_approved: 'Aceptadas',
    ideas_status_pending: 'En revisión',
    ideas_status_approved: 'Aceptada',
    ideas_status_discarded: 'Descartada',
    ideas_empty: 'Nada por aquí todavía.',
    ideas_approve: 'Aprobar',
    ideas_discard: 'Descartar',

    // Cuentas
    loans_title: 'Quién le debe a quién',
    loans_lead: 'Anota cada préstamo o gasto compartido. La fecha y hora se guardan solas, y los saldos se compensan entre sí.',
    loans_register: 'Registrar movimiento',
    loans_your_balance: 'Tu saldo',
    loans_owed: 'Te deben',
    loans_owe: 'Debes',
    loans_settled: 'Estás a paz y salvo',
    loans_group_total: 'Total registrado en el grupo',
    loans_settle_up: 'Para quedar a mano',
    loans_no_debts: '¡Nadie le debe a nadie!',
    loans_history: 'Historial',
    loans_mine_only: 'Solo mis cuentas',
    loans_settle: 'Saldar',
    loans_reactivate: 'Reactivar',
    loans_history_empty: 'Aquí aparecerá cada movimiento con su fecha y hora.',
    loans_direct: 'Directa',
    loans_minimal: 'Mín. transferencias',
    loans_pays_to: 'le paga a',
    loans_search: 'Buscar...',

    // Admin
    admin_title: 'Panel del organizador',
    admin_lead: 'Aquí recibes lo que manda el grupo, decides y se refleja al instante.',
    admin_edit_route: 'Editar itinerario',

    // Modal de "proponer algo" (Ruta)
    propose_title: 'Proponer algo para este día',
    propose_field_title: 'Título',
    propose_field_category: 'Categoría',
    propose_field_cost: 'Costo estimado (opcional)',
    propose_field_details: 'Detalles',
    propose_sent: '¡Enviada! Queda en revisión del admin.',
    propose_see_all: 'Ver todas las ideas →',
    propose_send: 'Enviar',
    propose_sending: 'Enviando...',
    propose_cat_activity: 'Actividad',
    propose_cat_restaurant: 'Restaurante',
    propose_cat_transport: 'Transporte',
    propose_cat_party: 'Rumba',
    propose_cat_lodging: 'Hospedaje',
    propose_cat_other: 'Otro',

    // Genéricos
    generic_cancel: 'Cancelar',
    generic_save: 'Guardar',
    generic_saving: 'Guardando...',
    generic_yes: 'Sí',
  },
  en: {
    nav_subtitle: 'Oct 9–18, 2026 · Bogotá & the Caribbean',
    nav_theme_dark: 'Switch to light mode',
    nav_theme_light: 'Switch to dark mode',
    nav_sync: 'Sync live updates',
    nav_admin_badge: 'admin',
    nav_admin_exit: 'Back to traveler view',
    nav_admin_enter: 'admin',
    nav_admin_enter_prefix: "I'm",
    nav_change_user: 'Change nickname or sign out',

    tab_inicio: 'Home',
    tab_ruta: 'Route',
    tab_lugares: 'Places',
    tab_hospedaje: 'Stays',
    tab_transporte: 'Transport',
    tab_votar: 'Vote',
    tab_ideas: 'Ideas',
    tab_cuentas: 'Expenses',
    tab_admin: 'Admin',

    welcome_title_group: 'Welcome to the adventure',
    welcome_title_admin: "Organizer's panel",
    welcome_sub_group: 'Colombia · October 9–18, 2026',
    welcome_sub_admin: 'Control the itinerary, the group\'s ideas and the polls.',
    welcome_name_label: 'What do you want to be called on this adventure?',
    welcome_name_placeholder: 'Your name or nickname',
    welcome_secret_label: 'What is the secret word to join this adventure?',
    welcome_secret_placeholder: 'Ask the organizer for it',
    welcome_avatar_label: 'Pick your badge',
    welcome_enter: 'Enter',
    welcome_entering: 'Entering...',
    welcome_be_admin: "I'm the administrator",
    welcome_back_to_group: 'Back to group access',
    welcome_admin_password_label: 'Administrator password',
    welcome_admin_enter: 'Enter as admin',
    welcome_admin_entering: 'Checking...',
    welcome_footer: 'No sign-up or email needed. Your name is remembered on this browser.',
    welcome_new_title: 'Welcome to the adventure, {name}!',
    welcome_new_sub: 'You can now suggest places, vote on plans, and keep track of expenses with everyone.',
    welcome_back_title: 'Welcome back, {name}!',
    welcome_back_sub: 'That name was already registered — we picked up your profile and history right where you left it.',

    home_notices: 'Group notices',
    home_notice_placeholder: 'Write a notice for the whole group...',
    home_notice_publish: 'Post',
    home_notice_empty: 'No notices yet.',
    home_today: 'Today',
    home_kickoff: "Here's how we kick off",
    home_see_route: 'See the full route →',
    home_stat_budget: 'Estimated budget per person',
    home_stat_budget_action: 'See details',
    home_stat_polls: 'open polls to vote on',
    home_stat_polls_action: 'Vote',
    home_stat_suggestions: 'group ideas under review',
    home_stat_suggestions_action: 'Suggest something',
    home_stat_balance_sub: 'based on logged expenses',
    home_stat_balance_action: 'See expenses',
    home_settled: "You're all settled up",
    home_countdown_one_day: '1 day to go',
    home_countdown_days: '{n} days to go',
    home_countdown_day_of: 'Day {n} of {total}',
    home_countdown_over: 'The adventure is over',

    route_title: 'The route, day by day',
    route_lead: 'Tap a day on the calendar to jump to its plan.',
    route_total_budget: 'Estimated total budget per person',
    route_edit_day: 'Edit day',
    route_lodging: 'Stay',
    route_transport: 'Transport',
    route_day_budget: "Day's budget",
    route_lodging_fallback: 'To be arranged',
    route_transport_fallback: 'On foot / local',
    route_plan: "Day's plan",
    route_propose: 'Suggest something',
    route_add_activity: 'Add activity',
    route_no_activities: 'No activities logged for this day yet.',
    route_map_title: 'Route on the map',
    route_map_trip: 'Full trip',
    route_map_fullscreen: 'Full screen',
    route_map_places_in: 'places in',
    route_map_place: 'place',
    route_map_places: 'places',
    route_map_add_place: 'Add place',
    route_map_empty: 'No places yet for',

    places_title: 'Places to visit',
    places_lead: "What's already on the plan. Know another spot? Suggest it and the admin decides.",
    places_suggest: 'Suggest a place',
    places_add: 'Add place',
    places_all: 'All',
    places_view_map: 'Open map',
    places_remove: 'Remove',
    places_empty: 'No places here yet. Suggest one!',

    lodging_title: 'Where we sleep',
    lodging_lead: 'Prices marked as estimated are assumptions until we book.',
    lodging_suggest: 'Suggest a stay',
    lodging_add: 'Add stay',
    lodging_estimated: 'Estimated price',
    lodging_confirmed: 'Confirmed by the group',
    lodging_per_night: 'per person / night',
    lodging_total: 'Total',
    lodging_total_row: 'Lodging per person',
    lodging_empty: 'No stays added yet.',
    lodging_night: 'night',
    lodging_nights: 'nights',

    transport_title: 'How we get around',
    transport_lead: 'Legs between cities. Prices are per person and may change.',
    transport_suggest: 'Suggest transport',
    transport_add: 'Add leg',
    transport_per_person: 'per person',
    transport_total_row: 'Between-city transport per person',
    transport_empty: 'No transport legs added yet.',
    transport_note: 'Monday, October 12 is a public holiday: buses and flights fill up and get pricier. Best to book ahead.',

    polls_title: 'Polls',
    polls_lead: 'Pick an option and you\'re done — your vote counts right away.',
    polls_propose: 'Propose a poll',
    polls_active: 'Active vote',
    polls_closed: 'Closed',
    polls_pending: 'Pending approval',
    polls_empty: 'No polls yet.',
    polls_approve: 'Approve',
    polls_discard: 'Discard',
    polls_close: 'Close',
    polls_reopen: 'Reopen',
    polls_vote: 'Vote',
    polls_proposed_by: 'Proposed by',

    ideas_title: 'Group ideas',
    ideas_lead: 'Suggest places, stays, timings, or anything you think matters. The admin reviews them and decides what makes the plan.',
    ideas_propose: 'Suggest an idea',
    ideas_all: 'All',
    ideas_pending: 'Under review',
    ideas_approved: 'Accepted',
    ideas_status_pending: 'Under review',
    ideas_status_approved: 'Accepted',
    ideas_status_discarded: 'Declined',
    ideas_empty: 'Nothing here yet.',
    ideas_approve: 'Approve',
    ideas_discard: 'Discard',

    loans_title: 'Who owes whom',
    loans_lead: "Log every loan or shared expense. Date and time save themselves, and balances offset each other.",
    loans_register: 'Log an expense',
    loans_your_balance: 'Your balance',
    loans_owed: "You're owed",
    loans_owe: 'You owe',
    loans_settled: "You're all settled up",
    loans_group_total: 'Total logged in the group',
    loans_settle_up: 'To settle up',
    loans_no_debts: 'Nobody owes anybody!',
    loans_history: 'History',
    loans_mine_only: 'Only my expenses',
    loans_settle: 'Settle',
    loans_reactivate: 'Reactivate',
    loans_history_empty: 'Every entry will show up here with its date and time.',
    loans_direct: 'Direct',
    loans_minimal: 'Min. transfers',
    loans_pays_to: 'pays',
    loans_search: 'Search...',

    admin_title: "Organizer's panel",
    admin_lead: 'Here you receive what the group sends, decide, and it updates instantly.',
    admin_edit_route: 'Edit itinerary',

    propose_title: 'Suggest something for this day',
    propose_field_title: 'Title',
    propose_field_category: 'Category',
    propose_field_cost: 'Estimated cost (optional)',
    propose_field_details: 'Details',
    propose_sent: 'Sent! It\'s now under the admin\'s review.',
    propose_see_all: 'See all ideas →',
    propose_send: 'Send',
    propose_sending: 'Sending...',
    propose_cat_activity: 'Activity',
    propose_cat_restaurant: 'Restaurant',
    propose_cat_transport: 'Transport',
    propose_cat_party: 'Nightlife',
    propose_cat_lodging: 'Stay',
    propose_cat_other: 'Other',

    generic_cancel: 'Cancel',
    generic_save: 'Save',
    generic_saving: 'Saving...',
    generic_yes: 'Yes',
  },
} as const;

export type TKey = keyof typeof DICT.es;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string>) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem('rc_lang');
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* localStorage bloqueado: seguimos con la detección del navegador */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('rc_lang', l);
    } catch {
      /* modo incógnito o storage bloqueado: el idioma dura solo esta sesión */
    }
  };

  const t = (key: TKey, vars?: Record<string, string>): string => {
    let str: string = DICT[lang][key] ?? DICT.es[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
};

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang debe usarse dentro de <LangProvider>');
  return ctx;
}
