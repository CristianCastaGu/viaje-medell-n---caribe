import React, { useState } from 'react';
import { MapPin, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Place, PlaceCategory, CityName } from '../types';
import { CITY_LABEL, CITY_ORDER, CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';
import { createPlace, deletePlace } from '../api';
import { Button, Chip, EmptyState, FilterPill, SectionHeader } from './ui';
import { useLang } from '../lib/i18n';

interface PlacesViewProps {
  places: Place[];
  isAdmin: boolean;
  onRefresh: () => void;
  onNavigateToSuggestions: () => void;
}

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  imperdible: 'Imperdible',
  comida: 'Comida',
  rumba: 'Rumba',
  naturaleza: 'Naturaleza',
  cultura: 'Cultura',
  evento: 'Evento',
};

function mapsUrl(name: string, city: string): string {
  return (
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(`${name} ${city} Colombia`)
  );
}

export const PlacesView: React.FC<PlacesViewProps> = ({
  places,
  isAdmin,
  onRefresh,
  onNavigateToSuggestions,
}) => {
  const { t } = useLang();
  const [filter, setFilter] = useState<'all' | CityName>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    city: 'Medellín' as CityName,
    name: '',
    category: 'imperdible' as PlaceCategory,
    description: '',
    lat: '',
    lng: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Bogotá no lista lugares: es solo el punto de salida y de regreso.
  const cities = CITY_ORDER.filter((c) => c !== 'bog').map((c) => CITY_LABEL[c] as CityName);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    const ok = await createPlace({
      city: form.city,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
    });
    setIsSaving(false);
    if (ok) {
      setForm({ city: form.city, name: '', category: 'imperdible', description: '', lat: '', lng: '' });
      setIsAdding(false);
      onRefresh();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Quitar "${name}" de la lista de lugares?`)) return;
    if (await deletePlace(id)) onRefresh();
  };

  return (
    <div>
      <SectionHeader
        title={t('places_title')}
        lead={t('places_lead')}
        actions={
          <>
            <Button onClick={onNavigateToSuggestions}>{t('places_suggest')}</Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setIsAdding((v) => !v)}>
                <Plus className="w-4 h-4" /> {t('places_add')}
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
                className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Categoría</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as PlaceCategory })}
                className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink"
              >
                {(Object.keys(CATEGORY_LABEL) as PlaceCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-ink">Nombre del lugar</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Castillo San Felipe"
              className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-ink">Descripción</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Por qué vale la pena, cuándo iríamos, qué cuesta..."
              className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 min-h-[80px] text-ink"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Latitud (opcional)</span>
              <input
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="Ej. 10.4227"
                inputMode="decimal"
                className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Longitud (opcional)</span>
              <input
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="Ej. -75.5389"
                inputMode="decimal"
                className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink"
              />
            </label>
          </div>
          <p className="text-[11px] text-ink2 -mt-1">
            Si las dejas vacías, el lugar igual aparece en la lista, pero no tendrá una posición exacta en el mapa de la Ruta.
          </p>
          <div className="flex gap-2.5">
            <Button onClick={handleAdd} disabled={isSaving || !form.name.trim()}>
              {isSaving ? 'Guardando...' : 'Guardar lugar'}
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-2">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('places_all')}
        </FilterPill>
        {cities.map((c) => (
          <FilterPill key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </FilterPill>
        ))}
      </div>

      {cities
        .filter((c) => filter === 'all' || filter === c)
        .map((city) => {
          const rows = places.filter((p) => p.city === city);
          const style = CITY_STYLE[cityCodeFromName(city)];
          return (
            <section key={city} className="mt-8 bg-surface/70 backdrop-blur-md border border-line/60 rounded-2xl p-5 sm:p-6">
              <h3
                className={`text-2xl font-bold tracking-[-0.02em] pb-1.5 flex justify-between gap-2.5 border-b-4 ${style.border} text-ink`}
              >
                <span>{city}</span>
                <span className="text-ink2 text-base font-medium self-end">
                  {rows.length} {rows.length === 1 ? t('route_map_place') : t('route_map_places')}
                </span>
              </h3>

              {rows.length === 0 ? (
                <div className="mt-3">
                  <EmptyState>{t('places_empty')}</EmptyState>
                </div>
              ) : (
                rows.map((p) => (
                  <div
                    key={p.id}
                    className="grid sm:grid-cols-[1fr_auto] gap-3.5 py-3.5 border-b border-line"
                  >
                    <div>
                      <b className="text-ink font-bold">{p.name}</b>{' '}
                      <Chip>{CATEGORY_LABEL[p.category] ?? p.category}</Chip>
                      <p className="text-ink2 text-[15px] mt-0.5">{p.description}</p>
                    </div>
                    <div className="flex gap-2 items-start flex-wrap sm:justify-end">
                      <a
                        href={mapsUrl(p.name, p.city)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 border-[1.5px] border-line text-ink bg-transparent px-3 py-1.5 text-[13px] rounded-[9px] min-h-[40px] font-semibold hover:border-ink"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {t('places_view_map')}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="inline-flex items-center justify-center gap-1.5 border-[1.5px] border-line text-ink2 bg-transparent px-3 py-1.5 text-[13px] rounded-[9px] min-h-[40px] font-semibold hover:border-bad hover:text-bad cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t('places_remove')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>
          );
        })}
    </div>
  );
};
