// Utilidades de fecha para el itinerario: todo se deriva de isoDate
// (la fecha real del día) en vez de asumir "día N = 9 de octubre + N".
// Así, agregar/quitar días del itinerario no rompe nada que dependa de
// la posición del día en la lista.

const WEEKDAYS = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-10-21" -> Date a mediodía UTC (evita saltos de día por huso horario). */
export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** "2026-10-21" -> "Miércoles 21 de Octubre" */
export function formatSpanishDate(iso: string): string {
  const d = parseIsoDate(iso);
  const weekday = WEEKDAYS[d.getUTCDay()];
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  return `${capitalize(weekday)} ${day} de ${capitalize(month)}`;
}

/** "2026-10-21" -> 21 */
export function dayOfMonth(iso: string): number {
  return parseIsoDate(iso).getUTCDate();
}

/** "2026-10-21" -> "octubre" */
export function monthName(iso: string): string {
  return MONTHS[parseIsoDate(iso).getUTCMonth()];
}

/** Suma N días a una fecha ISO y devuelve otra fecha ISO ("YYYY-MM-DD"). */
export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
