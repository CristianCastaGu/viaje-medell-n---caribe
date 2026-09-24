-- =====================================================================
-- Viaje Medellín - Caribe — migración 004
-- =====================================================================
-- Pega TODO en SQL Editor -> New query -> Run. Segura de correr más de
-- una vez (ADD COLUMN IF NOT EXISTS).
--
-- Qué agrega: costo estimado por persona (COP) para cada lugar, para
-- mostrarlo en la pestaña Lugares.
-- =====================================================================

alter table places add column if not exists estimated_cost_cop bigint;

-- Fin de la migración 004.
