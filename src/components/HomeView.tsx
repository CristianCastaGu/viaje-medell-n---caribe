import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Vote, Lightbulb, Coins } from 'lucide-react';
import { ItineraryDay, Announcement, Poll, Suggestion, Loan, Traveler, CityCode, ActiveTab } from '../types';
import { formatCOP, calculateIndividualBalances } from '../utils/debts';
import { CITY_LABEL, CITY_ORDER, CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';
import { createAnnouncement, deleteAnnouncement } from '../api';
import { Button, EmptyState, inputCls } from './ui';

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

const TRIP_START = Date.UTC(2026, 9, 9); // 9 de octubre de 2026
const DAY_MS = 86400000;

function countdown(): { label: string } {
  const now = Date.now();
  if (now < TRIP_START) {
    const days = Math.ceil((TRIP_START - now) / DAY_MS);
    return { label: days === 1 ? 'Falta 1 día' : `Faltan ${days} días` };
  }
  const dayIdx = Math.floor((now - TRIP_START) / DAY_MS);
  if (dayIdx < 10) return { label: `Día ${dayIdx + 1} de 10` };
  return { label: 'La aventura ya pasó' };
}

function currentOrFirstDay(itinerary: ItineraryDay[]): ItineraryDay {
  const now = Date.now();
  if (now >= TRIP_START) {
    const dayIdx = Math.min(9, Math.floor((now - TRIP_START) / DAY_MS));
    const found = itinerary.find((d) => d.dayNumber === dayIdx + 1);
    if (found) return found;
  }
  return itinerary[0];
}

function dayRangesByCity(itinerary: ItineraryDay[]): { code: CityCode; from: number; to: number }[] {
  const out: { code: CityCode; from: number; to: number }[] = [];
  itinerary.forEach((d) => {
    const code = cityCodeFromName(d.city);
    const last = out[out.length - 1];
    if (last && last.code === code) last.to = d.dayNumber;
    else out.push({ code, from: d.dayNumber, to: d.dayNumber });
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      videoRef.current?.pause();
    }
  }, []);

  if (!itinerary.length) return null;

  const groups = dayRangesByCity(itinerary);
  const today = currentOrFirstDay(itinerary);
  const cd = countdown();

  const totalBudget = itinerary.reduce((sum, d) => sum + (d.estimatedBudgetCOP || 0), 0);
  const openPolls = polls.filter((p) => p.status === 'activa').length;
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pendiente').length;
  const balances = calculateIndividualBalances(loans);
  const myBalance = currentUser ? balances[currentUser.name] || 0 : 0;
  const balanceLabel =
    Math.abs(myBalance) < 1
      ? 'Estás a paz y salvo'
      : myBalance > 0
        ? `Te deben ${formatCOP(myBalance)}`
        : `Debes ${formatCOP(Math.abs(myBalance))}`;

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
            9 <span aria-hidden="true">→</span> 18
          </h1>
          <p className="text-white/85 text-base sm:text-lg mt-2">de octubre de 2026 · Bogotá y el Caribe colombiano</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-5 text-lg sm:text-xl font-semibold">
            {CITY_ORDER.filter((c) => c !== 'bog').map((c) => (
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
          <div key={`${g.code}-${g.from}`} className={`h-2 rounded-full flex-1 min-w-[40px] ${CITY_STYLE[g.code].dot}`} />
        ))}
      </div>
      <div className="grid gap-3 mb-10" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
        {groups.map((g) => (
          <button
            key={`${g.code}-${g.from}-label`}
            onClick={() => onSelectTab('itinerario')}
            className="text-left cursor-pointer"
          >
            <p className="font-bold text-ink text-sm">{CITY_LABEL[g.code]}</p>
            <p className="text-xs text-ink2">{g.from === g.to ? `${g.from + 8} oct` : `${g.from + 8}–${g.to + 8} oct`}</p>
          </button>
        ))}
      </div>

      {/* Avisos del grupo */}
      <section className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">Avisos del grupo</h2>
        </div>
        {isAdmin && (
          <div className="flex gap-2 mb-3">
            <input
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              placeholder="Escribe un aviso para todo el grupo..."
              className={inputCls}
            />
            <Button onClick={handlePostAnnouncement} disabled={isPosting || !newAnnouncement.trim()}>
              <Plus className="w-4 h-4" /> Publicar
            </Button>
          </div>
        )}
        {announcements.length === 0 ? (
          <EmptyState>Sin avisos por ahora.</EmptyState>
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
            {Date.now() >= TRIP_START ? 'Hoy' : 'Arrancamos así'}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('itinerario')}>
            Ver la ruta completa →
          </Button>
        </div>
        <div className="flex gap-5 border-t-0" style={{ borderLeft: `5px solid var(--color-${cityCodeFromName(today.city)})` }}>
          <div className="pl-5">
            <div className="flex items-baseline gap-3">
              <b className="text-4xl font-bold tracking-[-0.05em] text-ink">{today.dayNumber + 8}</b>
              <span className="text-xs text-ink2">Oct</span>
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
          <span className="text-ink2 text-sm">Presupuesto estimado por persona</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('itinerario')}>
            Ver detalle
          </Button>
        </div>
        <div className="border-t-[3px] border-ink pt-3">
          <b className="block text-2xl sm:text-3xl tracking-[-0.03em] text-ink">{openPolls}</b>
          <span className="text-ink2 text-sm">encuestas abiertas para votar</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('encuestas')}>
            <Vote className="w-3.5 h-3.5" /> Votar
          </Button>
        </div>
        <div className="border-t-[3px] border-ink pt-3">
          <b className="block text-2xl sm:text-3xl tracking-[-0.03em] text-ink">{pendingSuggestions}</b>
          <span className="text-ink2 text-sm">ideas del grupo en revisión</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('sugerencias')}>
            <Lightbulb className="w-3.5 h-3.5" /> Sugerir algo
          </Button>
        </div>
        <div className="border-t-[3px] border-ink pt-3">
          <b className={`block text-xl sm:text-2xl tracking-[-0.03em] ${myBalance > 1 ? 'text-ok' : myBalance < -1 ? 'text-bad' : 'text-ink'}`}>
            {balanceLabel}
          </b>
          <span className="text-ink2 text-sm">según las cuentas registradas</span>
          <br />
          <Button variant="ghost" size="sm" onClick={() => onSelectTab('prestamos')}>
            <Coins className="w-3.5 h-3.5" /> Ver cuentas
          </Button>
        </div>
      </div>
    </div>
  );
};
