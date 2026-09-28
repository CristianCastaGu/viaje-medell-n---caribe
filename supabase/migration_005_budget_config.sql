-- =====================================================================
-- Viaje Medellín - Caribe — migración 005
-- =====================================================================
-- Pega TODO en SQL Editor -> New query -> Run. Segura de correr más de
-- una vez (ADD COLUMN IF NOT EXISTS).
--
-- Qué agrega: columna para guardar los "valores base" del presupuesto
-- por persona (comida/día, rumba, transporte local, extras, Tayrona,
-- temporada alta) que el admin configura y desde donde arranca el
-- escenario personal de cada viajero en la nueva pestaña Presupuesto.
-- =====================================================================

alter table trip_config add column if not exists budget_config jsonb;

-- Fin de la migración 005.
