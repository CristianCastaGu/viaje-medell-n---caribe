-- =====================================================================
-- Viaje Medellín - Caribe — esquema de base de datos para Supabase
-- =====================================================================
-- Cómo usar:
-- 1. Entra a tu proyecto en https://supabase.com/dashboard
-- 2. Ve a "SQL Editor" -> "New query"
-- 3. Pega TODO este archivo y dale "Run"
-- 4. Verifica en "Table Editor" que aparecieron las 6 tablas
--
-- Seguridad: dejamos Row Level Security (RLS) ACTIVADO en todas las
-- tablas y SIN políticas para el rol "anon"/"authenticated". Eso
-- significa que la llave pública (anon key) no puede leer ni escribir
-- nada directamente. Solo el backend (usando la service_role key,
-- que nunca se expone al navegador) puede leer/escribir. Así la
-- palabra secreta del grupo y la contraseña del admin siguen siendo
-- la única puerta de entrada real.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Viajeros (personas que ingresaron con la palabra secreta del grupo)
-- ---------------------------------------------------------------------
create table if not exists travelers (
  id          text primary key,
  name        text not null,
  avatar      text not null default '🌴',
  joined_at   timestamptz not null default now()
);
create unique index if not exists travelers_name_lower_idx on travelers (lower(name));

-- ---------------------------------------------------------------------
-- Itinerario: un registro por día del viaje (9 al 18 de octubre)
-- Las actividades del día se guardan como arreglo JSON dentro del día,
-- igual que ya lo maneja el frontend (ActivityItem[]).
-- ---------------------------------------------------------------------
create table if not exists itinerary_days (
  day_number            integer primary key,
  date                  text not null,
  iso_date              date not null,
  city                  text not null,
  title                 text not null,
  tagline               text not null default '',
  lodging               text not null default '',
  lodging_notes         text,
  transport             text not null default '',
  estimated_budget_cop  bigint not null default 0,
  activities            jsonb not null default '[]'::jsonb,
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Sugerencias del grupo (lugares, hospedajes, cambios, etc.)
-- ---------------------------------------------------------------------
create table if not exists suggestions (
  id                  text primary key,
  day_number          integer references itinerary_days (day_number) on delete set null,
  city                text,
  proposer_id         text not null,
  proposer_name       text not null,
  title               text not null,
  category            text not null default 'otro',
  description         text not null default '',
  estimated_cost_cop  bigint,
  status              text not null default 'pendiente' check (status in ('pendiente','aprobada','descartada')),
  admin_note          text,
  created_at          timestamptz not null default now()
);
create index if not exists suggestions_status_idx on suggestions (status);

-- ---------------------------------------------------------------------
-- Encuestas / votaciones. Las opciones (con sus votos por nombre) se
-- guardan como JSON, igual que hoy: [{ id, text, votes: [nombres] }]
-- ---------------------------------------------------------------------
create table if not exists polls (
  id             text primary key,
  question       text not null,
  description    text,
  options        jsonb not null default '[]'::jsonb,
  created_by     text not null,
  creator_role   text not null default 'traveler' check (creator_role in ('admin','traveler')),
  status         text not null default 'pendiente' check (status in ('activa','cerrada','pendiente','descartada')),
  created_at     timestamptz not null default now()
);
create index if not exists polls_status_idx on polls (status);

-- ---------------------------------------------------------------------
-- Préstamos entre miembros del grupo (quién le prestó a quién)
-- ---------------------------------------------------------------------
create table if not exists loans (
  id          text primary key,
  lender      text not null,
  borrower    text not null,
  amount      bigint not null check (amount > 0),
  concept     text not null,
  settled     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists loans_settled_idx on loans (settled);

-- ---------------------------------------------------------------------
-- Configuración general del viaje (fila única, id = 1)
-- ---------------------------------------------------------------------
create table if not exists trip_config (
  id                    smallint primary key default 1 check (id = 1),
  trip_name             text not null default 'Medellín - Caribe 2026',
  dates                 text not null default '9 - 18 de Octubre',
  cities                jsonb not null default '["Medellín","Cartagena","Barranquilla","Palomino","Santa Marta"]'::jsonb,
  auto_approve_polls    boolean not null default false
);

-- ---------------------------------------------------------------------
-- Row Level Security: activado, sin políticas -> bloqueado por
-- completo para anon/authenticated. Solo la service_role (backend)
-- puede leer o escribir, porque ese rol siempre se salta RLS.
-- ---------------------------------------------------------------------
alter table travelers        enable row level security;
alter table itinerary_days   enable row level security;
alter table suggestions      enable row level security;
alter table polls            enable row level security;
alter table loans            enable row level security;
alter table trip_config      enable row level security;

-- Fin del esquema.
