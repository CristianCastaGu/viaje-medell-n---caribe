-- =====================================================================
-- Viaje Medellín - Caribe — migración 002: Lugares, Hospedaje, Transporte
-- =====================================================================
-- Cómo usar: igual que supabase/schema.sql — pega TODO este archivo en
-- SQL Editor -> New query -> Run. Es seguro correrlo más de una vez
-- (usa IF NOT EXISTS).
--
-- Por qué una migración aparte y no editar schema.sql: schema.sql ya se
-- corrió en producción: agregarle tablas ahí no las crearía en una base
-- que ya existe. Esta migración solo agrega lo nuevo.
--
-- Qué agrega: tres colecciones que antes vivían solo como texto libre
-- dentro de cada día del itinerario (lugares a visitar, hospedaje,
-- transporte) y ahora son sus propias tablas, filtrables y con precio
-- por ítem — para las pestañas Lugares / Hospedaje / Transporte.
-- =====================================================================

create table if not exists places (
  id           text primary key,
  city         text not null,
  name         text not null,
  category     text not null default 'imperdible'
                 check (category in ('imperdible','comida','rumba','naturaleza','cultura','evento')),
  description  text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists places_city_idx on places (city);

create table if not exists lodging (
  id                    text primary key,
  city                  text not null,
  name                  text not null,
  from_date             date not null,
  to_date               date not null,
  price_per_night_cop   bigint not null default 0,
  is_estimated          boolean not null default true,
  notes                 text not null default '',
  created_at            timestamptz not null default now()
);
create index if not exists lodging_city_idx on lodging (city);

create table if not exists transport_legs (
  id           text primary key,
  from_city    text not null,
  to_city      text not null,
  date         date not null,
  time         text not null default '',
  mode         text not null default 'bus' check (mode in ('bus','vuelo','otro')),
  price_cop    bigint not null default 0,
  is_estimated boolean not null default true,
  color_city   text not null default 'med',
  notes        text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists transport_legs_date_idx on transport_legs (date);

alter table places          enable row level security;
alter table lodging         enable row level security;
alter table transport_legs  enable row level security;

-- Sin políticas para anon/authenticated: igual que el resto del esquema,
-- solo el backend (service_role) lee y escribe. Ver supabase/schema.sql
-- para la explicación completa.

-- Fin de la migración 002.
