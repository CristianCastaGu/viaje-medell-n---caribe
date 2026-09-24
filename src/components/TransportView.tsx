import React, { useState } from 'react';
import { Plus, Trash2, Bus, Plane, MoveRight } from 'lucide-react';
import { TransportLeg, TransportMode, CityCode } from '../types';
import { CITY_LABEL, CITY_ORDER } from '../lib/cityTheme';
import { createTransportLeg, deleteTransportLeg } from '../api';
import {
  Button,
  Chip,
  EmptyState,
  NoteBanner,
  SectionHeader,
  Ticket,
  TotalRow,
  formatCOP,
} from './ui';
import { useLang } from '../lib/i18n';

interface TransportViewProps {
  transportLegs: TransportLeg[];
  isAdmin: boolean;
  onRefresh: () => void;
  onNavigateToSuggestions: () => void;
}

const MODE_LABEL: Record<TransportMode, string> = {
  bus: 'Bus',
  vuelo: 'Vuelo',
  otro: 'Otro',
};

function dayParts(iso: string): { day: number; weekday: string; month: string } {
  const d = new Date(`${iso}T12:00:00Z`);
  return {
    day: Number(iso.split('-')[2]),
    weekday: d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'UTC' }),
    month: d.toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' }),
  };
}

export const TransportView: React.FC<TransportViewProps> = ({
  transportLegs,
  isAdmin,
  onRefresh,
  onNavigateToSuggestions,
}) => {
  const { t } = useLang();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    fromCity: 'Bogotá',
    toCity: 'Medellín',
    date: '2026-10-09',
    time: '',
    mode: 'bus' as TransportMode,
    priceCOP: 0,
    isEstimated: true,
    colorCity: 'med' as CityCode,
    notes: '',
  });

  const sorted = [...transportLegs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const total = transportLegs.reduce((sum, t) => sum + t.priceCOP, 0);

  const handleAdd = async () => {
    if (!form.fromCity.trim() || !form.toCity.trim()) return;
    setIsSaving(true);
    const ok = await createTransportLeg({
      ...form,
      fromCity: form.fromCity.trim(),
      toCity: form.toCity.trim(),
      notes: form.notes.trim(),
      priceCOP: Number(form.priceCOP) || 0,
    });
    setIsSaving(false);
    if (ok) {
      setIsAdding(false);
      setForm({ ...form, notes: '', priceCOP: 0, time: '' });
      onRefresh();
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`¿Quitar el tramo "${label}"?`)) return;
    if (await deleteTransportLeg(id)) onRefresh();
  };

  const inputCls =
    'w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink';

  return (
    <div>
      <SectionHeader
        title={t('transport_title')}
        lead={t('transport_lead')}
        actions={
          <>
            <Button onClick={onNavigateToSuggestions}>{t('transport_suggest')}</Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setIsAdding((v) => !v)}>
                <Plus className="w-4 h-4" /> {t('transport_add')}
              </Button>
            )}
          </>
        }
      />

      <NoteBanner>{t('transport_note')}</NoteBanner>

      {isAdmin && isAdding && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-6 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Desde</span>
              <input
                value={form.fromCity}
                onChange={(e) => setForm({ ...form, fromCity: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Hasta</span>
              <input
                value={form.toCity}
                onChange={(e) => setForm({ ...form, toCity: e.target.value })}
                className={inputCls}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Fecha</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Hora / momento</span>
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="Mediodía"
                className={inputCls}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Medio</span>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as TransportMode })}
                className={inputCls}
              >
                {(Object.keys(MODE_LABEL) as TransportMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">COP por persona</span>
              <input
                inputMode="numeric"
                value={form.priceCOP || ''}
                onChange={(e) =>
                  setForm({ ...form, priceCOP: Number(e.target.value.replace(/\D/g, '')) })
                }
                placeholder="55000"
                className={inputCls}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Color (ciudad de destino)</span>
              <select
                value={form.colorCity}
                onChange={(e) => setForm({ ...form, colorCity: e.target.value as CityCode })}
                className={inputCls}
              >
                {CITY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CITY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-ink">Notas</span>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Duración, empresa, escalas..."
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isEstimated}
              onChange={(e) => setForm({ ...form, isEstimated: e.target.checked })}
              className="w-5 h-5"
            />
            El precio todavía es un estimado
          </label>
          <div className="flex gap-2.5">
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar tramo'}
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState>{t('transport_empty')}</EmptyState>
      ) : (
        <>
          <div className="grid gap-4">
            {sorted.map((tl) => {
              const d = dayParts(tl.date);
              const ModeIcon = tl.mode === 'vuelo' ? Plane : tl.mode === 'bus' ? Bus : MoveRight;
              return (
                <Ticket
                  key={tl.id}
                  city={tl.colorCity}
                  stubTop={d.day}
                  stubBottom={`${d.weekday} · ${d.month}`}
                  end={
                    <>
                      <Chip tone={tl.isEstimated ? 'wait' : 'ok'}>
                        {tl.isEstimated ? t('lodging_estimated') : t('lodging_confirmed')}
                      </Chip>
                      <div>
                        <b className="text-[22px] tracking-[-0.03em] text-ink">
                          {formatCOP(tl.priceCOP)}
                        </b>
                        <br />
                        <span className="text-ink2 text-sm">{t('transport_per_person')}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(tl.id, `${tl.fromCity} → ${tl.toCity}`)}
                          className="inline-flex items-center gap-1.5 border-[1.5px] border-line text-ink2 px-3 py-1.5 text-[13px] rounded-[9px] font-semibold hover:border-bad hover:text-bad cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t('places_remove')}
                        </button>
                      )}
                    </>
                  }
                >
                  <h3 className="text-[19px] font-bold text-ink flex items-center gap-2 flex-wrap">
                    {tl.fromCity} <MoveRight className="w-4 h-4 text-ink2" /> {tl.toCity}
                  </h3>
                  <div className="flex items-center gap-2 my-1.5 flex-wrap">
                    <Chip>
                      <ModeIcon className="w-3.5 h-3.5" />
                      {MODE_LABEL[tl.mode] ?? tl.mode}
                    </Chip>
                    {tl.time && <span className="text-ink2 text-sm">{tl.time}</span>}
                  </div>
                  <p className="text-ink2 text-[15px]">{tl.notes}</p>
                </Ticket>
              );
            })}
          </div>
          <TotalRow label={t('transport_total_row')} value={formatCOP(total)} />
        </>
      )}
    </div>
  );
};
