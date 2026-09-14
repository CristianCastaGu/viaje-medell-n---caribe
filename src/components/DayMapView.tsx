import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Maximize2, Minimize2, Navigation, Layers, Compass, 
  ExternalLink, Clock, AlertTriangle, Lightbulb, ChevronRight,
  Sparkles, CheckCircle2, X
} from 'lucide-react';
import { DAY_MAP_ROUTES, DayMapStop, TRIP_MACRO_POINTS, DayRouteData } from '../data/mapData';
import { formatCOP } from '../utils/debts';

interface DayMapViewProps {
  dayNumber: number;
  cityName: string;
  onProposeChange?: (dayNumber: number) => void;
}

const TILE_LAYERS = {
  streets: {
    name: 'Callejero',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satelital',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  voyager: {
    name: 'Turístico',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
  },
};

export const DayMapView: React.FC<DayMapViewProps> = ({
  dayNumber,
  cityName,
  onProposeChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const modalMapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const modalMapInstanceRef = useRef<L.Map | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<'streets' | 'satellite' | 'voyager'>('voyager');
  const [activeStop, setActiveStop] = useState<DayMapStop | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'fullTrip'>('day');

  const routeData: DayRouteData | undefined = DAY_MAP_ROUTES[dayNumber];

  // Helper to build divIcon HTML
  const createPinIcon = (number: number, title: string, category: string, isHighlighted: boolean) => {
    const bgGradient = isHighlighted
      ? 'background: linear-gradient(135deg, #ea580c, #c2410c); transform: scale(1.15);'
      : 'background: linear-gradient(135deg, #f97316, #ea580c);';

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            ${bgGradient}
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 14px;
            font-family: sans-serif;
            transition: all 0.2s ease;
          ">
            ${number}
          </div>
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 8px;
            background: #ea580c;
            transform: translateX(-50%) rotate(45deg);
            border-bottom: 2px solid #ffffff;
            border-right: 2px solid #ffffff;
          "></div>
        </div>
      `,
      iconSize: [38, 44],
      iconAnchor: [19, 42],
      popupAnchor: [0, -42],
    });
  };

  // Build popup HTML
  const createPopupContent = (stop: DayMapStop) => {
    return `
      <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; max-width: 260px; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 9999px;">
            Parada ${stop.order} · ${stop.category}
          </span>
          <span style="font-size: 11px; font-weight: 700; color: #475569;">
            ${stop.time}
          </span>
        </div>
        <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; line-height: 1.2;">
          ${stop.title}
        </h4>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">
          ${stop.description}
        </p>
        <div style="font-size: 11px; color: #0f766e; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
          📍 ${stop.locationName}
        </div>
        ${
          stop.googleMapsUrl
            ? `<a href="${stop.googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; font-size: 11px; font-weight: 700; background: #0f172a; color: #ffffff; padding: 6px 10px; border-radius: 8px; text-decoration: none;">
                Abrir en Google Maps →
              </a>`
            : ''
        }
      </div>
    `;
  };

  // Render or update embedded map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous map if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const currentRoute = routeData || DAY_MAP_ROUTES[1];
    const initialCenter: L.LatLngTuple = viewMode === 'fullTrip' ? [9.0, -74.8] : (currentRoute.center as L.LatLngTuple);
    const initialZoom = viewMode === 'fullTrip' ? 7 : currentRoute.zoom;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      scrollWheelZoom: false,
      zoomControl: false,
    });

    // Add zoom controls on top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tile layer
    const tileConfig = TILE_LAYERS[selectedLayer];
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);

    if (viewMode === 'fullTrip') {
      // Macro trail across Colombia
      const macroLatLngs = TRIP_MACRO_POINTS.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(macroLatLngs, {
        color: '#f97316',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.9,
      }).addTo(map);

      TRIP_MACRO_POINTS.forEach((pt, idx) => {
        const icon = L.divIcon({
          className: 'macro-pin',
          html: `
            <div style="
              background: #0f172a;
              color: #ffffff;
              padding: 4px 8px;
              border-radius: 12px;
              border: 2px solid #f97316;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${pt.icon}</span>
              <span>${pt.name}</span>
            </div>
          `,
          iconAnchor: [40, 20],
        });
        const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <b style="font-size: 13px;">${pt.name}</b>
            <p style="font-size: 11px; color: #475569; margin: 4px 0 0 0;">${pt.days}</p>
          </div>
        `);
      });

      const bounds = L.latLngBounds(macroLatLngs);
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      // Day specific route
      if (currentRoute.routePolyline && currentRoute.routePolyline.length > 1) {
        L.polyline(currentRoute.routePolyline, {
          color: '#ea580c',
          weight: 4.5,
          opacity: 0.85,
          dashArray: '6, 6',
          lineCap: 'round',
        }).addTo(map);
      }

      currentRoute.stops.forEach((stop) => {
        const isSelected = activeStop?.id === stop.id;
        const icon = createPinIcon(stop.order, stop.title, stop.category, isSelected);
        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
        marker.bindPopup(createPopupContent(stop));
        marker.on('click', () => {
          setActiveStop(stop);
        });
      });

      if (currentRoute.stops.length > 0) {
        const bounds = L.latLngBounds(currentRoute.stops.map((s) => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
      }
    }

    mapInstanceRef.current = map;

    // Timeout to recalculate container size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [dayNumber, selectedLayer, viewMode, activeStop]);

  // Handle Fullscreen Modal Map
  useEffect(() => {
    if (!isFullscreen || !modalMapContainerRef.current) return;

    if (modalMapInstanceRef.current) {
      modalMapInstanceRef.current.remove();
      modalMapInstanceRef.current = null;
    }

    const currentRoute = routeData || DAY_MAP_ROUTES[1];
    const initialCenter: L.LatLngTuple = viewMode === 'fullTrip' ? [9.0, -74.8] : (currentRoute.center as L.LatLngTuple);
    const initialZoom = viewMode === 'fullTrip' ? 7 : currentRoute.zoom;

    const modalMap = L.map(modalMapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(modalMap);

    const tileConfig = TILE_LAYERS[selectedLayer];
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(modalMap);

    if (viewMode === 'fullTrip') {
      const macroLatLngs = TRIP_MACRO_POINTS.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(macroLatLngs, {
        color: '#f97316',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.9,
      }).addTo(modalMap);

      TRIP_MACRO_POINTS.forEach((pt) => {
        const icon = L.divIcon({
          className: 'macro-pin-modal',
          html: `
            <div style="
              background: #0f172a;
              color: #ffffff;
              padding: 6px 10px;
              border-radius: 14px;
              border: 2px solid #f97316;
              font-size: 12px;
              font-weight: 800;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <span>${pt.icon}</span>
              <span>${pt.name}</span>
            </div>
          `,
          iconAnchor: [45, 20],
        });
        const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(modalMap);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 6px;">
            <b style="font-size: 14px;">${pt.name}</b>
            <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">${pt.days}</p>
          </div>
        `);
      });

      const bounds = L.latLngBounds(macroLatLngs);
      modalMap.fitBounds(bounds, { padding: [50, 50] });
    } else {
      if (currentRoute.routePolyline && currentRoute.routePolyline.length > 1) {
        L.polyline(currentRoute.routePolyline, {
          color: '#ea580c',
          weight: 5,
          opacity: 0.9,
          dashArray: '6, 6',
          lineCap: 'round',
        }).addTo(modalMap);
      }

      currentRoute.stops.forEach((stop) => {
        const isSelected = activeStop?.id === stop.id;
        const icon = createPinIcon(stop.order, stop.title, stop.category, isSelected);
        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(modalMap);
        marker.bindPopup(createPopupContent(stop));
        marker.on('click', () => {
          setActiveStop(stop);
        });
      });

      if (currentRoute.stops.length > 0) {
        const bounds = L.latLngBounds(currentRoute.stops.map((s) => [s.lat, s.lng]));
        modalMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    }

    modalMapInstanceRef.current = modalMap;

    const timer = setTimeout(() => {
      modalMap.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      modalMap.remove();
      modalMapInstanceRef.current = null;
    };
  }, [isFullscreen, selectedLayer, viewMode, activeStop, dayNumber]);

  const currentRoute = routeData || DAY_MAP_ROUTES[1];

  return (
    <div className="space-y-4 pt-4">
      {/* Section Header: "Ruta en Mapa" + "Pantalla Completa" */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Ruta en Mapa
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hidden sm:inline">
                Día {dayNumber} · {currentRoute.cityName}
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle: Day Route vs 10-Day Macro Trail */}
          <div className="bg-slate-100 p-0.5 rounded-xl hidden sm:flex items-center text-xs font-bold text-slate-600">
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Día {dayNumber}
            </button>
            <button
              onClick={() => setViewMode('fullTrip')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'fullTrip' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Viaje Completo
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            id="btn-map-fullscreen-toggle"
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            title="Abrir mapa en pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Pantalla Completa</span>
          </button>
        </div>
      </div>

      {/* Embedded Map Card */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 group">
        {/* Map Canvas Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-[320px] sm:h-[400px] z-0"
          style={{ minHeight: '320px' }}
        />

        {/* Top Controls Overlay on Map */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
          {/* Layer switcher */}
          <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-1 text-[11px] font-bold">
            <Layers className="w-3 h-3 text-slate-500" />
            <button
              onClick={() => setSelectedLayer('voyager')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                selectedLayer === 'voyager' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Color
            </button>
            <button
              onClick={() => setSelectedLayer('streets')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                selectedLayer === 'streets' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Callejero
            </button>
            <button
              onClick={() => setSelectedLayer('satellite')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                selectedLayer === 'satellite' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satélite
            </button>
          </div>
        </div>

        {/* Top-Right Quick Legend */}
        <div className="absolute top-3 right-12 z-10 hidden sm:flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200/80 text-[11px] font-bold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span>{currentRoute.stops.length} paradas planificadas</span>
        </div>

        {/* Bottom Route Summary Badge (Matching the screenshot style!) */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto bg-amber-50/95 backdrop-blur-md border border-amber-300/80 text-amber-950 px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2 max-w-lg text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="truncate">
              <span>{currentRoute.distanceLabel}</span>
              <span className="hidden sm:inline text-amber-800/80 font-normal ml-1.5">
                · {currentRoute.transportAdvice}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(true)}
            className="pointer-events-auto bg-slate-900/90 hover:bg-slate-900 text-white px-3 py-2 rounded-2xl shadow-lg text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explorar Paradas</span>
          </button>
        </div>
      </div>

      {/* Stop Pills list underneath the map for rapid navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
        {currentRoute.stops.map((stop) => {
          const isSelected = activeStop?.id === stop.id;
          return (
            <button
              key={stop.id}
              onClick={() => {
                setActiveStop(stop);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([stop.lat, stop.lng], 15, { animate: true });
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-left shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-xs ring-2 ring-orange-500/20'
                  : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                {stop.order}
              </span>
              <div className="truncate max-w-[140px] sm:max-w-[180px]">
                <p className="text-xs font-bold text-slate-900 truncate">{stop.title}</p>
                <p className="text-[10px] text-slate-500">{stop.time}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom CTA Card: "¿Quieres ajustar la hora o ruta?" (Exact component from user's image) */}
      <div className="bg-gradient-to-br from-teal-50/90 via-cyan-50/70 to-emerald-50/70 border border-teal-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
              ¿Quieres ajustar la hora o ruta?
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 max-w-md">
              Cualquier miembro del grupo puede someter una nueva parada o sugerencia a votación rápida.
            </p>
          </div>
        </div>

        <button
          id="btn-propose-activity-day"
          onClick={() => {
            if (onProposeChange) {
              onProposeChange(dayNumber);
            }
          }}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Lightbulb className="w-4 h-4 text-amber-200" />
          <span>Proponer actividad o cambio para Día {dayNumber}</span>
          <ChevronRight className="w-4 h-4 opacity-70" />
        </button>
      </div>

      {/* Fullscreen Interactive Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Mapa Interactivo: {viewMode === 'day' ? `Día ${dayNumber} (${currentRoute.cityName})` : 'Recorrido General Medellín - Caribe'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {currentRoute.distanceLabel} · {currentRoute.transportAdvice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Layer switch in modal */}
              <div className="bg-white/10 p-1 rounded-xl hidden sm:flex items-center text-xs font-semibold text-slate-300">
                <button
                  onClick={() => setSelectedLayer('voyager')}
                  className={`px-2.5 py-1 rounded-lg ${selectedLayer === 'voyager' ? 'bg-orange-500 text-white' : ''}`}
                >
                  Color
                </button>
                <button
                  onClick={() => setSelectedLayer('streets')}
                  className={`px-2.5 py-1 rounded-lg ${selectedLayer === 'streets' ? 'bg-orange-500 text-white' : ''}`}
                >
                  Calles
                </button>
                <button
                  onClick={() => setSelectedLayer('satellite')}
                  className={`px-2.5 py-1 rounded-lg ${selectedLayer === 'satellite' ? 'bg-orange-500 text-white' : ''}`}
                >
                  Satélite
                </button>
              </div>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Cerrar mapa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: Map + Sidebar with Stops */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Map Canvas */}
            <div
              ref={modalMapContainerRef}
              className="flex-1 w-full h-full min-h-[300px]"
            />

            {/* Stops Sidebar */}
            <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto max-h-[45vh] lg:max-h-full p-4 space-y-3 shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Paradas de la Ruta ({currentRoute.stops.length})
                </span>
                <span className="text-xs font-bold text-orange-600">
                  {currentRoute.totalDistanceKm} km aprox.
                </span>
              </div>

              {currentRoute.stops.map((stop) => {
                const isSelected = activeStop?.id === stop.id;
                return (
                  <div
                    key={stop.id}
                    onClick={() => {
                      setActiveStop(stop);
                      if (modalMapInstanceRef.current) {
                        modalMapInstanceRef.current.setView([stop.lat, stop.lng], 16, { animate: true });
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                          {stop.order}
                        </span>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                            {stop.title}
                          </h5>
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-orange-500" />
                            {stop.time}
                          </span>
                        </div>
                      </div>

                      {stop.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0">
                          {stop.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {stop.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-teal-700 font-semibold truncate max-w-[170px]">
                        📍 {stop.locationName}
                      </span>
                      {stop.googleMapsUrl && (
                        <a
                          href={stop.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-orange-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsFullscreen(false);
                    if (onProposeChange) onProposeChange(dayNumber);
                  }}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Proponer cambio o parada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
