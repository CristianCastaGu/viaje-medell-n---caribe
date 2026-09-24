import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Lodging, CityName } from '../types';
import { CITY_LABEL, CITY_ORDER, cityCodeFromName } from '../lib/cityTheme';
import { createLodging, deleteLodging } from '../api';
import { Button, Chip, CityDot, EmptyState, SectionHeader, Ticket, TotalRow, formatCOP } from './ui';
import { useLang } from '../lib/i18n';

interface LodgingViewProps {
  lodging: Lodging[];
  isAdmin: boolean;
  onRefresh: () => void;
  onNavigateToSuggestions: () => void;
}

function nights(l: Lodging): number {
  return Math.max(0, Math.round((Date.parse(l.toDate) - Date.parse(l.fromDate)) / 86400000));
}

function dayOf(iso: string): number {
  return Number(iso.split('-')[2]);
}

function monthOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('es-CO', { month: 'long', timeZone: 'UTC' });
}

export const LodgingView: React.FC<LodgingViewProps> = ({
  lodging,
  isAdmin,
  onRefresh,
  onNavigateToSuggestions,
}) => {
  const { t } = useLang();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    city: 'Medellín' as CityName,
    name: '',
    fromDate: '2026-10-10',
    toDate: '2026-10-12',
    pricePerNightCOP: 0,
    isEstimated: true,
    notes: '',
  });

  const sorted = [...lodging].sort((a, b) => (a.fromDate < b.fromDate ? -1 : 1));
  const total = lodging.reduce((sum, l) => sum + nights(l) * l.pricePerNightCOP, 0);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    const ok = await createLodging({
      ...form,
      name: form.name.trim(),
      notes: form.notes.trim(),
      pricePerNightCOP: Number(form.pricePerNightCOP) || 0,
    });
    setIsSaving(false);
    if (ok) {
      setIsAdding(false);
      setForm({ ...form, name: '', notes: '', pricePerNightCOP: 0 });
      onRefresh();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Quitar "${name}" de la lista de hospedajes?`)) return;
    if (await deleteLodging(id)) onRefresh();
  };

  const inputCls =
    'w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink';

  return (
    <div>
      <SectionHeader
        title={t('lodging_title')}
        lead={t('lodging_lead')}
        actions={
          <>
            <Button onClick={onNavigateToSuggestions}>{t('lodging_suggest')}</Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setIsAdding((v) => !v)}>
                <Plus className="w-4 h-4" /> {t('lodging_add')}
              </Button>
            )}
          </>
        }
      />

      {isAdmin && isAdding && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-6 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Ciudad</span>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value as CityName })}
                className={inputCls}
              >
                {CITY_ORDER.map((c) => (
                  <option key={c} value={CITY_LABEL[c]}>
                    {CITY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Nombre</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Airbnb en Getsemaní"
                className={inputCls}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Entrada</span>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Salida</span>
              <input
                type="date"
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">COP por persona/noche</span>
              <input
                inputMode="numeric"
                value={form.pricePerNightCOP || ''}
                onChange={(e) =>
                  setForm({ ...form, pricePerNightCOP: Number(e.target.value.replace(/\D/g, '')) })
                }
                placeholder="90000"
                className={inputCls}
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-ink">Notas</span>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Horario de check-in, quién reserva, etc."
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
            El precio todavía es un estimado (no está reservado)
          </label>
          <div className="flex gap-2.5">
            <Button onClick={handleAdd} disabled={isSaving || !form.name.trim()}>
              {isSaving ? 'Guardando...' : 'Guardar hospedaje'}
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState>{t('lodging_empty')}</EmptyState>
      ) : (
        <>
          <div className="grid gap-4">
            {sorted.map((l) => {
              const n = nights(l);
              return (
                <Ticket
                  key={l.id}
                  city={cityCodeFromName(l.city)}
                  stubTop={n}
                  stubBottom={n === 1 ? t('lodging_night') : t('lodging_nights')}
                  end={
                    <>
                      <Chip tone={l.isEstimated ? 'wait' : 'ok'}>
                        {l.isEstimated ? t('lodging_estimated') : t('lodging_confirmed')}
                      </Chip>
                      <div>
                        <b className="text-[22px] tracking-[-0.03em] text-ink">
                          {formatCOP(l.pricePerNightCOP)}
                        </b>
                        <br />
                        <span className="text-ink2 text-sm">{t('lodging_per_night')}</span>
                        <br />
                        <span className="text-sm text-ink">
                          {t('lodging_total')}: {formatCOP(n * l.pricePerNightCOP)}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(l.id, l.name)}
                          className="inline-flex items-center gap-1.5 border-[1.5px] border-line text-ink2 px-3 py-1.5 text-[13px] rounded-[9px] font-semibold hover:border-bad hover:text-bad cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t('places_remove')}
                        </button>
                      )}
                    </>
                  }
                >
                  <h3 className="text-[19px] font-bold text-ink">{l.name}</h3>
                  <div className="flex items-center gap-2 my-1.5 text-ink2 text-sm">
                    <CityDot city={l.city} />
                    {l.city} · {dayOf(l.fromDate)} → {dayOf(l.toDate)} {monthOf(l.toDate)}
                  </div>
                  <p className="text-ink2 text-[15px]">{l.notes}</p>
                </Ticket>
              );
            })}
          </div>
          <TotalRow label={t('lodging_total_row')} value={formatCOP(total)} />
        </>
      )}
    </div>
  );
};
