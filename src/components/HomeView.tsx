import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Vote, Lightbulb, Coins } from 'lucide-react';
import { ItineraryDay, Announcement, Poll, Suggestion, Loan, Traveler, CityCode, ActiveTab } from '../types';
import { formatCOP, calculateIndividualBalances } from '../utils/debts';
import { CITY_LABEL, CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';
import { dayOfMonth, monthName, parseIsoDate } from '../lib/dates';
import { createAnnouncement, deleteAnnouncement } from '../api';
import { Button, EmptyState, inputCls } from './ui';
import { useLang, TKey } from '../lib/i18n';

interface HomeViewProps {
  itinerary: ItineraryDay[];
  announcements: Announcement[];
  polls: Poll[];
  suggestions: Suggestion[];
  loans: Loan[];
  currentUser: Traveler | null;
  isAdmin: boolean;
  onRefresh: () => void;
  onSelectTab: (tab: ActiveTab) => void;
}

const DAY_MS = 86400000;

/** Itinerario ordenado por fecha real (no por dayNumber: agregar/quitar
 * días no siempre deja dayNumber en el mismo orden que las fechas). */
function byDate(itinerary: ItineraryDay[]): ItineraryDay[] {
  return [...itinerary].sort((a, b) => (a.isoDate < b.isoDate ? -1 : a.isoDate > b.isoDate ? 1 : 0));
}

function countdown(
  sorted: ItineraryDay[],
  t: (key: TKey, vars?: Record<string, string>) => string
): { label: string } {
  if (!sorted.length) return { label: '' };
  const start = parseIsoDate(sorted[0].isoDate).getTime();
  const end = parseIsoDate(sorted[sorted.length - 1].isoDate).getTime();
  const now = Date.now();
  if (now < start) {
    const days = Math.ceil((start - now) / DAY_MS);
    return { label: days === 1 ? t('home_countdown_one_day') : t('home_countdown_days', { n: String(days) }) };
  }
  if (now > end + DAY_MS) return { label: t('home_countdown_over') };
  const dayIdx = Math.min(sorted.length - 1, Math.floor((now - start) / DAY_MS));
  return { label: t('home_countdown_day_of', { n: String(dayIdx + 1), total: String(sorted.length) }) };
}

/** El día de hoy si cae dentro del rango del viaje; si no ha empezado,
 * el primero; si ya terminó, el último. Se guía por la fecha real de
 * cada día, no por su posición en la lista. */
function currentOrFirstDay(sorted: ItineraryDay[]): ItineraryDay {
  const todayIso = new Date().toISOString().slice(0, 10);
  let candidate = sorted[0];
  for (const d of sorted) {
    if (d.isoDate <= todayIso) candidate = d;
    else break;
  }
  return candidate;
}

/** Ciudades en el orden real en que aparecen en el itinerario, con el
 * rango de fechas de cada tramo consecutivo. Se recalcula solo cuando
 * cambia el itinerario, así que agregar/quitar/mover un día lo refleja
 * automáticamente. */
function dayRangesByCity(sorted: ItineraryDay[]): { code: CityCode; fromIso: string; toIso: string }[] {
  const out: { code: CityCode; fromIso: string; toIso: string }[] = [];
  sorted.forEach((d) => {
    const code = cityCodeFromName(d.city);
    const last = out[out.length - 1];
    if (last && last.code === code) last.toIso = d.isoDate;
    else out.push({ code, fromIso: d.isoDate, toIso: d.isoDate });
  });
  return out;
}

export const HomeView: React.FC<HomeViewProps> = ({
  itinerary,
  announcements,
  polls,
  suggestions,
  loans,
  currentUser,
  isAdmin,
  onRefresh,
  onSelectTab,
}) => {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      videoRef.current?.pause();
    }
  }, []);

  if (!itinerary.length) return null;

  const sorted = byDate(itinerary);
  const groups = dayRangesByCity(sorted);
  const today = currentOrFirstDay(sorted);
  const cd = countdown(sorted, t);
  const firstDay = sorted[0];
  const lastDay = sorted[sorted.length - 1];
  // Ciudades en el orden real en que aparecen (sin repetir), no una lista fija.
  const cityWords = Array.from(new Set(sorted.map((d) => cityCodeFromName(d.city))));

  const totalBudget = itinerary.reduce((sum, d) => sum + (d.estimatedBudgetCOP || 0), 0);
  const openPolls = polls.filter((p) => p.status === 'activa').length;
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pendiente').length;
  const balances = calculateIndividualBalances(loans);
  const myBalance = currentUser ? balances[currentUser.name] || 0 : 0;
  const balanceLabel =
    Math.abs(myBalance) < 1
      ? t('loans_settled')
      : myBalance > 0
        ? `${t('loans_owed')} ${formatCOP(myBalance)}`
        : `${t('loans_owe')} ${formatCOP(Math.abs(myBalance))}`;

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    setIsPosting(true);
    const ok = await createAnnouncement(newAnnouncement.trim());
    setIsPosting(false);
    if (ok) {
      setNewAnnouncement('');
      onRefresh();
    }
  };
  const handleRemoveAnnouncement = async (id: string) => {
    if (!window.confirm('¿Quitar este aviso?')) return;
    if (await deleteAnnouncement(id)) onRefresh();
  };

  return (
    <div>
      {/* Hero con video de fondo */}
      <div className="relative overflow-hidden rounded-2xl mb-8">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,21,26,.35) 0%, rgba(10,21,26,.55) 55%, rgba(10,21,26,.85) 100%)',
          }}
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-16">
          <h1 className="text-white text-[clamp(48px,11vw,110px)] font-bold leading-[0.9] tracking-[-0.05em] flex items-center gap-4 flex-wrap">
            {dayOfMonth(firstDay.isoDate)} <span aria-hidden="true">→</span> {dayOfMonth(lastDay.isoDate)}
          </h1>
          <p className="text-white/85 text-base sm:text-lg mt-2">
            de {monthName(firstDay.isoDate)} de {parseIsoDate(firstDay.isoDate).getUTCFullYear()} · Bogotá y el Caribe
            colombiano
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-5 text-lg sm:text-xl font-semibold">
            {cityWords.map((c) => (
              <span key={c} className="text-white pb-0.5" style={{ borderBottom: `4px solid var(--color-${c})` }}>
                {CITY_LABEL[c]}
              </span>
            ))}
          </div>

          <span className="inline-block mt-6 border-[1.5px] border-white/70 text-white rounded-full px-4 py-1.5 font-semibold text-sm">
            {cd.label}
          </span>
        </div>
      </div>

      {/* Franja de ciudades con rango de días */}
      <div className="flex gap-1.5 mb-2 overflow-x-auto">
        {groups.map((g) => (
          <div key={`${g.code}-${g.fromIso}`} className={`h-2 rounded-full flex-1 min-w-[40px] ${CITY_STYLE[g.code].dot}`} />
        ))}
      </div>
      <div className="grid gap-3 mb-10" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
        {groups.map((g) => (
          <button
            key={`${g.code}-${g.fromIso}-label`}
            onClick={() => onSelectTab('itinerario')}
            className="text-left cursor-pointer"
          >
            <p className="font-bold text-ink text-sm">{CITY_LABEL[g.code]}</p>
            <p className="text-xs text-ink2">
              {g.fromIso === g.toIso
                ? `${dayOfMonth(g.fromIso)} ${monthName(g.fromIso).slice(0, 3)}`
                : `${dayOfMonth(g.fromIso)}–${dayOfMonth(g.toIso)} ${monthName(g.toIso).slice(0, 3)}`}
            </p>
          </button>
        ))}
      </div>

      {/* Avisos del grupo */}
      <section className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">{t('home_notices')}</h2>
        </div>
        {isAdmin && (
          <div className="flex gap-2 mb-3">
            <input
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              placeholder={t('home_notice_placeholder')}
              className={inputCls}
            />
            <Button onClick={handlePostAnnouncement} disabled={isPosting || !newAnnouncement.trim()}>
              <Plus className="w-4 h-4" /> {t('home_notice_publish')}
            </Button>
          </div>
        )}
        {announcements.length === 0 ? (
          <EmptyState>{t('home_notice_empty')}</EmptyState>
        ) : (
          <ul className="grid gap-3 list-none p-0 m-0">
            {announcements.map((a) => (
              <li key={a.id} className="border-l-4 border-ink pl-3.5 py-0.5 flex justify-between items-start gap-3">
                <span className="text-sm text-ink">{a.text}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleRemoveAnnouncement(a.id)}
                    className="text-ink2 hover:text-bad shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hoy / arrancamos así */}
      <section className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">
            {Date.now() >= parseIsoDate(firstDay.isoDate).getTime() ? t('home_today') : t('home_kickoff')}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('itinerario')}>
            {t('home_see_route')}
          </Button>
        </div>
        <div className="flex gap-5 border-t-0" style={{ borderLeft: `5px solid var(--color-${cityCodeFromName(today.city)})` }}>
          <div className="pl-5">
            <div className="flex items-baseline gap-3">
              <b className="text-4xl font-bold tracking-[-0.05em] text-ink">{dayOfMonth(today.isoDate)}</b>
              <span className="text-xs text-ink2">{monthName(today.isoDate).slice(0, 3)}</span>
            </div>
            <h3 className="text-lg font-bold text-ink mt-1">{today.title}</h3>
            <p className="text-sm text-ink2">{today.city}</p>
            <ul className="grid gap-1.5 mt-2 list-none p-0">
              {today.activities.slice(0, 4).map((act) => (
                <li key={act.id} className="flex gap-3 text-sm">
                  <span className="text-ink2 w-24 shrink-0">{act.time}</span>
                  <span className="text-ink">{act.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Resumen rápido */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="border-t-[3px] border-ink pt-3">
          <b className="block text-2xl sm:text-3xl tracking-[-0.03em] text-ink">{formatCOP(totalBudget)}</b>
          <span className="text-ink2 text-sm">{t('home_stat_budget')}</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('itinerario')}>
            {t('home_stat_budget_action')}
          </Button>
        </div>
        <div className="border-t-[3px] border-ink pt-3">
          <b className="block text-2xl sm:text-3xl tracking-[-0.03em] text-ink">{openPolls}</b>
          <span className="text-ink2 text-sm">{t('home_stat_polls')}</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('encuestas')}>
            <Vote className="w-3.5 h-3.5" /> {t('home_stat_polls_action')}
          </Button>
        </div>
        <div className="border-t-[3px] border-ink pt-3">
          <b className="block text-2xl sm:text-3xl tracking-[-0.03em] text-ink">{pendingSuggestions}</b>
          <span className="text-ink2 text-sm">{t('home_stat_suggestions')}</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('sugerencias')}>
            <Lightbulb className="w-3.5 h-3.5" /> {t('home_stat_suggestions_action')}
          </Button>
        </div>
        <div className="border-t-[3px] border-ink pt-3">
          <b className={`block text-xl sm:text-2xl tracking-[-0.03em] ${myBalance > 1 ? 'text-ok' : myBalance < -1 ? 'text-bad' : 'text-ink'}`}>
            {balanceLabel}
          </b>
          <span className="text-ink2 text-sm">{t('home_stat_balance_sub')}</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('prestamos')}>
            <Coins className="w-3.5 h-3.5" /> {t('home_stat_balance_action')}
          </Button>
        </div>
      </div>
    </div>
  );
};
