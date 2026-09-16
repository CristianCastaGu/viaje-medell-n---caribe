import { getSupabaseClient } from './supabaseClient';
import { INITIAL_TRIP_STATE } from '../defaultData';
import {
  TripState,
  Traveler,
  ItineraryDay,
  Suggestion,
  Poll,
  Loan,
  ActivityItem,
} from '../types';

// =====================================================================
// Capa de acceso a datos (Supabase / Postgres).
// Reemplaza el antiguo almacenamiento en memoria + archivo JSON local.
// Cada función hace una operación puntual y devuelve datos ya en el
// mismo formato (camelCase) que usa el frontend, para no tener que
// tocar src/api.ts ni los componentes de React.
// =====================================================================

let seedPromise: Promise<void> | null = null;

/** Se asegura de que la base tenga datos iniciales la primera vez que se usa. */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedIfEmpty().catch((err) => {
      // Si falla, permitimos reintentar en la siguiente llamada en vez
      // de dejar la app "rota" para siempre con una promesa fallida cacheada.
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function seedIfEmpty(): Promise<void> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('itinerary_days')
    .select('day_number', { count: 'exact', head: true });

  if (error) throw error;
  if (count && count > 0) return; // ya hay datos, no volver a sembrar

  const seed = INITIAL_TRIP_STATE;

  const { error: cfgErr } = await supabase.from('trip_config').upsert({
    id: 1,
    trip_name: seed.config.tripName,
    dates: seed.config.dates,
    cities: seed.config.cities,
    auto_approve_polls: seed.config.autoApprovePolls,
  });
  if (cfgErr) throw cfgErr;

  if (seed.travelers.length > 0) {
    const { error: travErr } = await supabase.from('travelers').insert(
      seed.travelers.map((t) => ({
        id: t.id,
        name: t.name,
        avatar: t.avatar,
        joined_at: t.joinedAt,
      }))
    );
    if (travErr) throw travErr;
  }

  if (seed.itinerary.length > 0) {
    const { error: dayErr } = await supabase.from('itinerary_days').insert(
      seed.itinerary.map((d) => dayToRow(d))
    );
    if (dayErr) throw dayErr;
  }

  if (seed.suggestions.length > 0) {
    const { error: sugErr } = await supabase.from('suggestions').insert(
      seed.suggestions.map((s) => suggestionToRow(s))
    );
    if (sugErr) throw sugErr;
  }

  if (seed.polls.length > 0) {
    const { error: pollErr } = await supabase.from('polls').insert(
      seed.polls.map((p) => pollToRow(p))
    );
    if (pollErr) throw pollErr;
  }

  if (seed.loans.length > 0) {
    const { error: loanErr } = await supabase.from('loans').insert(
      seed.loans.map((l) => loanToRow(l))
    );
    if (loanErr) throw loanErr;
  }
}

// ---------------------------------------------------------------------
// Conversión fila (snake_case, Postgres) <-> objeto (camelCase, TS)
// ---------------------------------------------------------------------

function dayToRow(d: ItineraryDay) {
  return {
    day_number: d.dayNumber,
    date: d.date,
    iso_date: d.isoDate,
    city: d.city,
    title: d.title,
    tagline: d.tagline,
    lodging: d.lodging,
    lodging_notes: d.lodgingNotes ?? null,
    transport: d.transport,
    estimated_budget_cop: d.estimatedBudgetCOP,
    activities: d.activities as unknown as ActivityItem[],
  };
}

function rowToDay(r: any): ItineraryDay {
  return {
    dayNumber: r.day_number,
    date: r.date,
    isoDate: r.iso_date,
    city: r.city,
    title: r.title,
    tagline: r.tagline,
    lodging: r.lodging,
    lodgingNotes: r.lodging_notes ?? undefined,
    transport: r.transport,
    estimatedBudgetCOP: Number(r.estimated_budget_cop),
    activities: r.activities ?? [],
  };
}

function suggestionToRow(s: Suggestion) {
  return {
    id: s.id,
    day_number: s.dayNumber ?? null,
    city: s.city ?? null,
    proposer_id: s.proposerId,
    proposer_name: s.proposerName,
    title: s.title,
    category: s.category,
    description: s.description,
    estimated_cost_cop: s.estimatedCostCOP ?? null,
    status: s.status,
    admin_note: s.adminNote ?? null,
    created_at: s.createdAt,
  };
}

function rowToSuggestion(r: any): Suggestion {
  return {
    id: r.id,
    dayNumber: r.day_number ?? undefined,
    city: r.city ?? undefined,
    proposerId: r.proposer_id,
    proposerName: r.proposer_name,
    title: r.title,
    category: r.category,
    description: r.description,
    estimatedCostCOP: r.estimated_cost_cop != null ? Number(r.estimated_cost_cop) : undefined,
    status: r.status,
    adminNote: r.admin_note ?? undefined,
    createdAt: r.created_at,
  };
}

function pollToRow(p: Poll) {
  return {
    id: p.id,
    question: p.question,
    description: p.description ?? null,
    options: p.options,
    created_by: p.createdBy,
    creator_role: p.creatorRole,
    status: p.status,
    created_at: p.createdAt,
  };
}

function rowToPoll(r: any): Poll {
  return {
    id: r.id,
    question: r.question,
    description: r.description ?? undefined,
    options: r.options ?? [],
    createdBy: r.created_by,
    creatorRole: r.creator_role,
    status: r.status,
    createdAt: r.created_at,
  };
}

function loanToRow(l: Loan) {
  return {
    id: l.id,
    lender: l.lender,
    borrower: l.borrower,
    amount: l.amount,
    concept: l.concept,
    settled: l.settled ?? false,
    created_at: l.createdAt,
  };
}

function rowToLoan(r: any): Loan {
  return {
    id: r.id,
    lender: r.lender,
    borrower: r.borrower,
    amount: Number(r.amount),
    concept: r.concept,
    createdAt: r.created_at,
    settled: r.settled,
  };
}

function rowToTraveler(r: any): Traveler {
  return {
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    joinedAt: r.joined_at,
  };
}

// ---------------------------------------------------------------------
// Lectura del estado completo
// ---------------------------------------------------------------------

export async function getFullState(): Promise<TripState> {
  await ensureSeeded();
  const supabase = getSupabaseClient();

  const [travelersRes, itineraryRes, suggestionsRes, pollsRes, loansRes, configRes] =
    await Promise.all([
      supabase.from('travelers').select('*').order('joined_at', { ascending: true }),
      supabase.from('itinerary_days').select('*').order('day_number', { ascending: true }),
      supabase.from('suggestions').select('*').order('created_at', { ascending: false }),
      supabase.from('polls').select('*').order('created_at', { ascending: false }),
      supabase.from('loans').select('*').order('created_at', { ascending: false }),
      supabase.from('trip_config').select('*').eq('id', 1).maybeSingle(),
    ]);

  for (const res of [travelersRes, itineraryRes, suggestionsRes, pollsRes, loansRes, configRes]) {
    if (res.error) throw res.error;
  }

  const cfg = configRes.data;

  return {
    travelers: (travelersRes.data ?? []).map(rowToTraveler),
    itinerary: (itineraryRes.data ?? []).map(rowToDay),
    suggestions: (suggestionsRes.data ?? []).map(rowToSuggestion),
    polls: (pollsRes.data ?? []).map(rowToPoll),
    loans: (loansRes.data ?? []).map(rowToLoan),
    config: cfg
      ? {
          tripName: cfg.trip_name,
          dates: cfg.dates,
          cities: cfg.cities,
          autoApprovePolls: cfg.auto_approve_polls,
        }
      : INITIAL_TRIP_STATE.config,
  };
}

// ---------------------------------------------------------------------
// Viajeros / autenticación de grupo
// ---------------------------------------------------------------------

export async function findTravelerByName(name: string): Promise<Traveler | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('travelers')
    .select('*')
    .ilike('name', name)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToTraveler(data) : null;
}

export async function createTraveler(traveler: Traveler): Promise<Traveler> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('travelers')
    .insert({
      id: traveler.id,
      name: traveler.name,
      avatar: traveler.avatar,
      joined_at: traveler.joinedAt,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTraveler(data);
}

// ---------------------------------------------------------------------
// Itinerario (admin)
// ---------------------------------------------------------------------

export async function upsertItineraryDay(day: ItineraryDay): Promise<ItineraryDay[]> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('itinerary_days').upsert(dayToRow(day));
  if (error) throw error;

  const { data, error: listErr } = await supabase
    .from('itinerary_days')
    .select('*')
    .order('day_number', { ascending: true });
  if (listErr) throw listErr;
  return (data ?? []).map(rowToDay);
}

export async function getItineraryDay(dayNumber: number): Promise<ItineraryDay | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('itinerary_days')
    .select('*')
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToDay(data) : null;
}

// ---------------------------------------------------------------------
// Sugerencias
// ---------------------------------------------------------------------

export async function insertSuggestion(suggestion: Suggestion): Promise<Suggestion[]> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('suggestions').insert(suggestionToRow(suggestion));
  if (error) throw error;
  return listSuggestions();
}

export async function listSuggestions(): Promise<Suggestion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSuggestion);
}

export async function getSuggestion(id: string): Promise<Suggestion | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSuggestion(data) : null;
}

export async function updateSuggestion(
  id: string,
  patch: Partial<Pick<Suggestion, 'status' | 'adminNote'>>
): Promise<Suggestion | null> {
  const supabase = getSupabaseClient();
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;

  const { data, error } = await supabase
    .from('suggestions')
    .update(row)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSuggestion(data) : null;
}

// ---------------------------------------------------------------------
// Encuestas
// ---------------------------------------------------------------------

export async function insertPoll(poll: Poll): Promise<Poll[]> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('polls').insert(pollToRow(poll));
  if (error) throw error;
  return listPolls();
}

export async function listPolls(): Promise<Poll[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToPoll);
}

export async function getPoll(id: string): Promise<Poll | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('polls').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToPoll(data) : null;
}

export async function updatePollOptions(id: string, options: Poll['options']): Promise<Poll | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('polls')
    .update({ options })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPoll(data) : null;
}

export async function updatePollStatus(id: string, status: Poll['status']): Promise<Poll | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('polls')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPoll(data) : null;
}

// ---------------------------------------------------------------------
// Préstamos
// ---------------------------------------------------------------------

export async function insertLoan(loan: Loan): Promise<Loan[]> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('loans').insert(loanToRow(loan));
  if (error) throw error;
  return listLoans();
}

export async function listLoans(): Promise<Loan[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToLoan);
}

export async function deleteLoan(id: string): Promise<{ deleted: boolean; loans: Loan[] }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('loans').delete().eq('id', id).select();
  if (error) throw error;
  const deleted = (data ?? []).length > 0;
  return { deleted, loans: await listLoans() };
}

export async function toggleSettleLoan(id: string): Promise<Loan | null> {
  const supabase = getSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) return null;

  const { data, error } = await supabase
    .from('loans')
    .update({ settled: !existing.settled })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? rowToLoan(data) : null;
}

// ---------------------------------------------------------------------
// Configuración / reinicio
// ---------------------------------------------------------------------

export async function updateConfig(patch: {
  autoApprovePolls?: boolean;
  tripName?: string;
}): Promise<TripState['config']> {
  const supabase = getSupabaseClient();
  const row: Record<string, unknown> = {};
  if (patch.autoApprovePolls !== undefined) row.auto_approve_polls = patch.autoApprovePolls;
  if (patch.tripName !== undefined) row.trip_name = patch.tripName;

  const { data, error } = await supabase
    .from('trip_config')
    .update(row)
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return {
    tripName: data.trip_name,
    dates: data.dates,
    cities: data.cities,
    autoApprovePolls: data.auto_approve_polls,
  };
}

export async function resetTripData(): Promise<TripState> {
  const supabase = getSupabaseClient();

  const textIdTables = ['suggestions', 'polls', 'loans', 'travelers'];
  await Promise.all(textIdTables.map(async (table) => {
    const { error } = await supabase.from(table).delete().neq('id', '__never_matches__');
    if (error) throw error;
  }));

  const { error: dayDeleteErr } = await supabase
    .from('itinerary_days')
    .delete()
    .neq('day_number', -999999);
  if (dayDeleteErr) throw dayDeleteErr;

  seedPromise = null;
  await ensureSeeded();
  return getFullState();
}
