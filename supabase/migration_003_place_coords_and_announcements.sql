-- =====================================================================
-- Viaje Medellín - Caribe — migración 003
-- =====================================================================
-- Igual que las anteriores: pega TODO en SQL Editor -> New query -> Run.
-- Seguro de correr más de una vez (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- Qué agrega:
-- 1. Coordenadas opcionales (lat/lng) a "places", para poder mostrarlos
--    como pines en el mapa embebido de cada día de la Ruta.
-- 2. Tabla "announcements" (avisos del grupo, editables por el admin,
--    visibles en la pestaña Inicio).
-- =====================================================================

alter table places add column if not exists lat double precision;
alter table places add column if not exists lng double precision;

create table if not exists announcements (
  id          text primary key,
  text        text not null,
  created_at  timestamptz not null default now()
);

alter table announcements enable row level security;
-- Sin políticas para anon/authenticated: mismo patrón que el resto del
-- esquema — solo el backend (service_role) lee y escribe.

-- Fin de la migración 003.
