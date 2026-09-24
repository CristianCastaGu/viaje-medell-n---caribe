import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { ItineraryDay, CityCode } from '../types';
import { CITY_LABEL, CITY_ORDER, CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';
import { CITY_COORDS, ROUTE_ORDER, TRIP_LANDMARKS } from '../lib/tripMap';
import { Button, SectionHeader, Surface } from './ui';

interface FullTripMapViewProps {
  itinerary: ItineraryDay[];
  onSelectDay?: (dayNumber: number) => void;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#333';
}

// Tiles de OpenStreetMap: no piden API key (a diferencia de los basemaps
// "voyager"/"dark_all" de CARTO, que ahora exigen una cuenta). El modo
// oscuro se logra con un filtro CSS sobre el propio tile en vez de pedir
// un set de tiles oscuro aparte — ver .leaflet-tile-pane en index.css.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

function cityIcon(code: CityCode, big: boolean): L.DivIcon {
  const size = big ? 22 : 14;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:var(--color-${code});
      border:2.5px solid var(--color-surface);
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function landmarkIcon(code: CityCode): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:8px;height:8px;border-radius:50%;
      background:var(--color-surface);
      border:2px solid var(--color-${code});
    "></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

/** Grupos de días consecutivos por ciudad, ej. Medellín: días 2–3. */
function dayRangesByCity(itinerary: ItineraryDay[]): Record<CityCode, { from: number; to: number }> {
  const out: Partial<Record<CityCode, { from: number; to: number }>> = {};
  itinerary.forEach((d) => {
    const code = cityCodeFromName(d.city);
    const cur = out[code];
    if (!cur) out[code] = { from: d.dayNumber, to: d.dayNumber };
    else out[code] = { from: Math.min(cur.from, d.dayNumber), to: Math.max(cur.to, d.dayNumber) };
  });
  return out as Record<CityCode, { from: number; to: number }>;
}

export const FullTripMapView: React.FC<FullTripMapViewProps> = ({ itinerary, onSelectDay }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [activeCity, setActiveCity] = useState<CityCode | null>(null);

  const ranges = dayRangesByCity(itinerary);

  // Crea el mapa una sola vez.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [8.3, -74.6],
      zoom: 6,
      scrollWheelZoom: false,
      zoomControl: false,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map);

    // Ruta completa: Bogotá -> Medellín -> Cartagena -> Barranquilla -> Palomino -> Santa Marta -> Bogotá
    const routeLatLngs = [...ROUTE_ORDER, 'bog' as CityCode].map((c) => CITY_COORDS[c]);
    L.polyline(routeLatLngs, {
      color: cssVar('--color-ink'),
      weight: 3,
      opacity: 0.55,
      dashArray: '2, 10',
      lineCap: 'round',
    }).addTo(map);

    ROUTE_ORDER.forEach((code) => {
      const marker = L.marker(CITY_COORDS[code], { icon: cityIcon(code, true) }).addTo(map);
      const range = ranges[code];
      const rangeLabel = range
        ? range.from === range.to
          ? `Día ${range.from}`
          : `Días ${range.from}–${range.to}`
        : '';
      marker.bindPopup(
        `<b style="font-family:var(--font-sans);color:var(--color-ink)">${CITY_LABEL[code]}</b>` +
          (rangeLabel ? `<br><span style="color:var(--color-ink2);font-size:12px">${rangeLabel}</span>` : '')
      );
      marker.on('click', () => setActiveCity(code));
    });

    TRIP_LANDMARKS.forEach((lm) => {
      const marker = L.marker([lm.lat, lm.lng], { icon: landmarkIcon(lm.city) }).addTo(map);
      marker.bindPopup(
        `<span style="font-family:var(--font-sans);color:var(--color-ink);font-size:12.5px">${lm.name}</span>`
      );
    });

    map.fitBounds(L.latLngBounds(routeLatLngs), { padding: [28, 28] });
    mapRef.current = map;

    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const flyToCity = (code: CityCode) => {
    setActiveCity(code);
    mapRef.current?.flyTo(CITY_COORDS[code], 11, { duration: 0.6 });
  };

  return (
    <div>
      <SectionHeader
        title="Mapa de la ruta"
        lead="Las 6 ciudades del viaje en orden, de Bogotá al Caribe y de vuelta. Toca una ciudad para ubicarla."
      />

      <div className="flex gap-2 flex-wrap mb-4">
        {ROUTE_ORDER.map((code) => {
          const style = CITY_STYLE[code];
          const range = ranges[code];
          const isActive = activeCity === code;
          return (
            <button
              key={code}
              onClick={() => flyToCity(code)}
              className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                isActive ? `${style.border} border-2` : 'border-line hover:border-ink2'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              {CITY_LABEL[code]}
              {range && (
                <span className="text-ink2 text-xs">
                  {range.from === range.to ? `· ${range.from}` : `· ${range.from}–${range.to}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Surface className="p-2 sm:p-2">
        <div ref={mapContainerRef} className="w-full h-[420px] sm:h-[480px] rounded-xl overflow-hidden" />
      </Surface>

      {activeCity && ranges[activeCity] && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-soft rounded-xl px-4 py-3 mt-4">
          <span className="text-sm text-ink flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-ink2" />
            <b>{CITY_LABEL[activeCity]}</b>
            <span className="text-ink2">
              {ranges[activeCity].from === ranges[activeCity].to
                ? `— Día ${ranges[activeCity].from}`
                : `— Días ${ranges[activeCity].from} a ${ranges[activeCity].to}`}
            </span>
          </span>
          {onSelectDay && (
            <Button size="sm" onClick={() => onSelectDay(ranges[activeCity].from)}>
              Ver plan de esos días →
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-ink2 mt-4">
        Mapa de referencia general (no es ruta turno a turno). Fuente: OpenStreetMap.
      </p>
    </div>
  );
};
