import React, { useState } from 'react';
import { Map, Calendar, Navigation, Compass, Layers, Sparkles, MapPin, ChevronRight, ExternalLink } from 'lucide-react';
import { DAY_MAP_ROUTES, TRIP_MACRO_POINTS } from '../data/mapData';
import { DayMapView } from './DayMapView';
import { ItineraryDay } from '../types';

interface FullTripMapViewProps {
  itinerary: ItineraryDay[];
  onSelectDay?: (dayNumber: number) => void;
  onNavigateToSuggestions?: (dayNumber: number) => void;
}

export const FullTripMapView: React.FC<FullTripMapViewProps> = ({
  itinerary,
  onSelectDay,
  onNavigateToSuggestions,
}) => {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(4); // Default to Day 4 as in the user's reference

  const currentRoute = DAY_MAP_ROUTES[selectedDayNumber] || DAY_MAP_ROUTES[1];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-teal-950/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white mb-2">
            <Compass className="w-3.5 h-3.5 text-amber-300" />
            Mapa Interactivo de Ruta
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Recorrido Medellín - Caribe 2026
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm mt-0.5 max-w-xl">
            Explora la geografía del viaje: desde las montañas de Antioquia hasta las playas de Barú, el Malecón de Barranquilla, las aguas del Tayrona y los ríos de Palomino.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 shrink-0 self-stretch sm:self-auto text-left sm:text-right">
          <p className="text-[11px] text-teal-200 uppercase font-semibold">
            Distancia Total Estimada
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-white">
            ~1.050 km
          </p>
          <p className="text-[10px] text-teal-200/80">
            5 Ciudades · 10 Días de travesía
          </p>
        </div>
      </div>

      {/* Day Selector Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Seleccionar Día para ver Paradas
          </span>
          <span className="text-xs font-semibold text-orange-600">
            Día {selectedDayNumber}: {currentRoute.cityName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {itinerary.map((day) => {
            const isSelected = day.dayNumber === selectedDayNumber;
            return (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDayNumber(day.dayNumber)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-500/20 scale-[1.02]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className={`text-[10px] ${isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                  Día {day.dayNumber}
                </span>
                <span className="truncate max-w-[80px]">{day.city}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Map View with all details and CTA */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7">
        <DayMapView
          dayNumber={selectedDayNumber}
          cityName={currentRoute.cityName}
          onProposeChange={(day) => {
            if (onNavigateToSuggestions) {
              onNavigateToSuggestions(day);
            }
          }}
        />
      </div>
    </div>
  );
};
