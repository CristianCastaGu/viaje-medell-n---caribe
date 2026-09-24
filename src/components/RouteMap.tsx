import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2, MapPin, Plus, Trash2 } from 'lucide-react';
import { ItineraryDay, Place, PlaceCategory, CityCode } from '../types';
import { CITY_LABEL, CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';
import { CITY_COORDS, ROUTE_ORDER } from '../lib/tripMap';
import { createPlace, deletePlace, resolveMapsLink } from '../api';
import { Button, Chip, Field, inputCls, formatCOP } from './ui';
import { useLang } from '../lib/i18n';

interface RouteMapProps {
  itinerary: ItineraryDay[];
  places: Place[];
  currentDay: ItineraryDay;
  isAdmin: boolean;
  onRefresh: () => void;
}

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

function cityIcon(code: CityCode, size = 22): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--color-${code});border:2.5px solid var(--color-surface);box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function numberedIcon(code: CityCode, n: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:var(--color-${code});border:2px solid var(--color-surface);
      box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);color:var(--color-surface);font:700 12px var(--font-sans)">${n}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

// Un pequeño desplazamiento reproducible para que lugares sin coordenadas
// no queden todos exactamente apilados sobre el centro de la ciudad.
function jitter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = ((h % 1000) / 1000 - 0.5) * 0.03;
  const b = (((h >> 8) % 1000) / 1000 - 0.5) * 0.03;
  return [a, b];
}

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  imperdible: 'Imperdible',
  comida: 'Comida',
  rumba: 'Rumba',
  naturaleza: 'Naturaleza',
  cultura: 'Cultura',
  evento: 'Evento',
};

export const RouteMap: React.FC<RouteMapProps> = ({ itinerary, places, currentDay, isAdmin, onRefresh }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mode, setMode] = useState<'day' | 'trip'>('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'imperdible' as PlaceCategory,
    description: '',
    estimatedCostCOP: '',
    mapsLink: '',
  });
  const [mapsLinkError, setMapsLinkError] = useState('');

  const { t } = useLang();
  const cityCode = cityCodeFromName(currentDay.city);
  const cityPlaces = places.filter((p) => p.city === currentDay.city);

  // Crea el mapa una vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redibuja marcadores/ruta cuando cambia el día, el modo o los lugares.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
    });

    if (mode === 'trip') {
      const routeLatLngs = [...ROUTE_ORDER, 'bog' as CityCode].map((c) => CITY_COORDS[c]);
      L.polyline(routeLatLngs, {
        color: getComputedStyle(document.documentElement).getPropertyValue('--color-ink') || '#333',
        weight: 3,
        opacity: 0.55,
        dashArray: '2, 10',
      }).addTo(map);
      ROUTE_ORDER.forEach((code) => {
        L.marker(CITY_COORDS[code], { icon: cityIcon(code) })
          .addTo(map)
          .bindPopup(`<b style="font-family:var(--font-sans);color:var(--color-ink)">${CITY_LABEL[code]}</b>`);
      });
      map.fitBounds(L.latLngBounds(routeLatLngs), { padding: [24, 24] });
    } else {
      const cityCenter = CITY_COORDS[cityCode];
      L.marker(cityCenter, { icon: cityIcon(cityCode, 16) }).addTo(map);
      const points: [number, number][] = [cityCenter];
      cityPlaces.forEach((p, idx) => {
        const [lat, lng] =
          p.lat != null && p.lng != null
            ? [p.lat, p.lng]
            : (() => {
                const [dx, dy] = jitter(p.id);
                return [cityCenter[0] + dx, cityCenter[1] + dy];
              })();
        points.push([lat, lng]);
        L.marker([lat, lng], { icon: numberedIcon(cityCode, idx + 1) })
          .addTo(map)
          .bindPopup(
            `<b style="font-family:var(--font-sans);color:var(--color-ink)">${idx + 1}. ${p.name}</b>` +
              `<br><span style="color:var(--color-ink2);font-size:12px">${CATEGORY_LABEL[p.category] ?? p.category}</span>`
          );
      });
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
      else map.setView(cityCenter, 12);
    }
  }, [mode, currentDay.dayNumber, cityPlaces.length]);

  // Pantalla completa nativa del navegador sobre el mismo contenedor: no
  // hace falta una segunda instancia de Leaflet, solo redibujar al cambiar.
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  };

  const handleAddPlace = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    setMapsLinkError('');

    let lat: number | undefined;
    let lng: number | undefined;
    if (form.mapsLink.trim()) {
      const resolved = await resolveMapsLink(form.mapsLink.trim());
      if (resolved.success) {
        lat = resolved.lat;
        lng = resolved.lng;
      } else {
        setMapsLinkError(resolved.error || 'No pudimos leer ese enlace.');
      }
    }

    const ok = await createPlace({
      city: currentDay.city,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      estimatedCostCOP: form.estimatedCostCOP ? Number(form.estimatedCostCOP) : undefined,
      lat,
      lng,
    });
    setIsSaving(false);
    if (ok) {
      setForm({ name: '', category: 'imperdible', description: '', estimatedCostCOP: '', mapsLink: '' });
      setIsAdding(false);
      onRefresh();
    }
  };

  const handleDeletePlace = async (id: string, name: string) => {
    if (!window.confirm(`¿Quitar "${name}" de los lugares de ${currentDay.city}?`)) return;
    if (await deletePlace(id)) onRefresh();
  };

  const style = CITY_STYLE[cityCode];

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-ink2" />
          <h4 className="font-bold text-ink">{t('route_map_title')}</h4>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${style.soft}`}>
            Día {currentDay.dayNumber} · {currentDay.city}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-soft p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setMode('day')}
              className={`px-3 py-1 rounded-md cursor-pointer ${mode === 'day' ? 'bg-surface text-ink shadow-sm' : 'text-ink2'}`}
            >
              Día {currentDay.dayNumber}
            </button>
            <button
              onClick={() => setMode('trip')}
              className={`px-3 py-1 rounded-md cursor-pointer ${mode === 'trip' ? 'bg-surface text-ink shadow-sm' : 'text-ink2'}`}
            >
              {t('route_map_trip')}
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            title={t('route_map_fullscreen')}
            className="p-1.5 rounded-lg border border-line text-ink2 hover:text-ink hover:border-ink cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`w-full rounded-xl overflow-hidden border border-line ${isFullscreen ? 'h-screen' : 'h-[320px] sm:h-[380px]'}`}
      />

      {mode === 'day' && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink2">
              {cityPlaces.length} {cityPlaces.length === 1 ? t('route_map_place') : t('route_map_places')} {t('route_map_places_in')} {currentDay.city}
            </span>
            {isAdmin && (
              <button
                onClick={() => setIsAdding((v) => !v)}
                className="text-xs font-semibold text-ink2 hover:text-ink flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t('route_map_add_place')}
              </button>
            )}
          </div>

          {isAdmin && isAdding && (
            <div className="bg-soft rounded-xl p-3.5 grid gap-2.5 mb-3">
              <div className="grid sm:grid-cols-2 gap-2.5">
                <Field label="Nombre">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Categoría">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as PlaceCategory })}
                    className={inputCls}
                  >
                    {(Object.keys(CATEGORY_LABEL) as PlaceCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Descripción">
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-2.5">
                <Field label="Costo por persona (COP, opcional)">
                  <input
                    value={form.estimatedCostCOP}
                    onChange={(e) => setForm({ ...form, estimatedCostCOP: e.target.value.replace(/\D/g, '') })}
                    placeholder="35000"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>
                <Field label="Enlace de Google Maps (opcional)">
                  <input
                    value={form.mapsLink}
                    onChange={(e) => setForm({ ...form, mapsLink: e.target.value })}
                    placeholder="Para ubicarlo en el mapa"
                    className={inputCls}
                  />
                </Field>
              </div>
              {mapsLinkError && <p className="text-[11px] text-bad">{mapsLinkError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddPlace} disabled={isSaving || !form.name.trim()}>
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {cityPlaces.length === 0 ? (
            <p className="text-sm text-ink2 italic">{t('route_map_empty')} {currentDay.city}.</p>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {cityPlaces.map((p, idx) => (
                <div key={p.id} className="shrink-0 w-56 bg-soft rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`w-5 h-5 rounded-full ${style.dot} text-surface text-[11px] font-bold flex items-center justify-center shrink-0`}>
                      {idx + 1}
                    </span>
                    {isAdmin && (
                      <button onClick={() => handleDeletePlace(p.id, p.name)} className="text-ink2 hover:text-bad cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="font-bold text-ink text-sm mt-1">{p.name}</p>
                  <Chip>{CATEGORY_LABEL[p.category] ?? p.category}</Chip>
                  {p.description && <p className="text-xs text-ink2 mt-1 line-clamp-2">{p.description}</p>}
                  {!!p.estimatedCostCOP && (
                    <p className="text-xs font-bold text-ink mt-1">{formatCOP(p.estimatedCostCOP)} p/p</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
