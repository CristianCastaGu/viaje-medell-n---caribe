import React, { useState } from 'react';
import { 
  Calendar, MapPin, Building, Bus, DollarSign, Clock, Plus, Edit2, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, Compass, Sparkles, Navigation, X, Lightbulb, Send
} from 'lucide-react';
import { ItineraryDay, ActivityItem, ActivityCategory, Traveler, SuggestionCategory } from '../types';
import { formatCOP } from '../utils/debts';
import { updateItineraryDay, createSuggestion } from '../api';
import { DayMapView } from './DayMapView';

interface ItineraryViewProps {
  itinerary: ItineraryDay[];
  isAdmin: boolean;
  currentUser?: Traveler | null;
  onItineraryUpdated: () => void;
  onNavigateToSuggestions?: (dayNumber?: number) => void;
}

const CITY_BADGES: Record<string, { bg: string; text: string; icon: string; border: string }> = {
  'Medellín': { bg: 'bg-emerald-100', text: 'text-emerald-900', icon: '⛰️', border: 'border-emerald-300' },
  'Cartagena': { bg: 'bg-amber-100', text: 'text-amber-900', icon: '🏰', border: 'border-amber-300' },
  'Barranquilla': { bg: 'bg-red-100', text: 'text-red-900', icon: '🎷', border: 'border-red-300' },
  'Santa Marta': { bg: 'bg-teal-100', text: 'text-teal-900', icon: '🐒', border: 'border-teal-300' },
  'Palomino': { bg: 'bg-cyan-100', text: 'text-cyan-900', icon: '🌴', border: 'border-cyan-300' },
};

const CATEGORY_COLORS: Record<ActivityCategory, { bg: string; text: string }> = {
  visita: { bg: 'bg-blue-100', text: 'text-blue-800' },
  comida: { bg: 'bg-orange-100', text: 'text-orange-800' },
  playa: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  transporte: { bg: 'bg-slate-100', text: 'text-slate-800' },
  hospedaje: { bg: 'bg-purple-100', text: 'text-purple-800' },
  rumba: { bg: 'bg-rose-100', text: 'text-rose-800' },
  naturaleza: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  itinerary,
  isAdmin,
  currentUser,
  onItineraryUpdated,
  onNavigateToSuggestions,
}) => {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  
  // Admin editing state
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editingDayData, setEditingDayData] = useState<ItineraryDay | null>(null);
  
  // Add activity state
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActTime, setNewActTime] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActCategory, setNewActCategory] = useState<ActivityCategory>('visita');
  const [newActCost, setNewActCost] = useState('');
  const [newActLocation, setNewActLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick proposal state (from map CTA)
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalDayNumber, setProposalDayNumber] = useState<number>(1);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalCategory, setProposalCategory] = useState<SuggestionCategory>('actividad');
  const [proposalDesc, setProposalDesc] = useState('');
  const [proposalCost, setProposalCost] = useState('');
  const [proposalSuccessMsg, setProposalSuccessMsg] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const handleOpenProposal = (day: number) => {
    setProposalDayNumber(day);
    setProposalSuccessMsg(false);
    setIsProposalModalOpen(true);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim()) return;
    setIsSubmittingProposal(true);
    const dayData = itinerary.find((d) => d.dayNumber === proposalDayNumber) || currentDay;
    const success = await createSuggestion({
      dayNumber: proposalDayNumber,
      city: dayData.city,
      proposerId: currentUser?.id || 'usr-anon',
      proposerName: currentUser?.name || 'Viajero',
      title: proposalTitle.trim(),
      category: proposalCategory,
      description: proposalDesc.trim(),
      estimatedCostCOP: proposalCost ? Number(proposalCost) : undefined,
      status: 'pendiente',
    });
    setIsSubmittingProposal(false);
    if (success) {
      setProposalSuccessMsg(true);
      setProposalTitle('');
      setProposalDesc('');
      setProposalCost('');
      onItineraryUpdated();
      setTimeout(() => {
        setIsProposalModalOpen(false);
        setProposalSuccessMsg(false);
      }, 1500);
    }
  };

  const currentDay = itinerary.find((d) => d.dayNumber === selectedDayNumber) || itinerary[0];

  const totalTripBudget = itinerary.reduce((acc, d) => acc + (d.estimatedBudgetCOP || 0), 0);

  const handleStartEditDay = () => {
    setEditingDayData(JSON.parse(JSON.stringify(currentDay)));
    setIsEditingDay(true);
  };

  const handleSaveDayEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDayData) return;
    setIsSaving(true);
    const success = await updateItineraryDay(editingDayData);
    setIsSaving(false);
    if (success) {
      setIsEditingDay(false);
      onItineraryUpdated();
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) return;

    const newActivity: ActivityItem = {
      id: 'act-' + Date.now().toString(36),
      time: newActTime.trim() || 'Horario sugerido',
      title: newActTitle.trim(),
      description: newActDesc.trim(),
      category: newActCategory,
      costEstimateCOP: newActCost ? Number(newActCost) : undefined,
      location: newActLocation.trim() || currentDay.city,
    };

    const updatedDay = {
      ...currentDay,
      activities: [...currentDay.activities, newActivity],
    };

    setIsSaving(true);
    const success = await updateItineraryDay(updatedDay);
    setIsSaving(false);
    if (success) {
      setNewActTitle('');
      setNewActTime('');
      setNewActDesc('');
      setNewActCost('');
      setNewActLocation('');
      setIsAddingActivity(false);
      onItineraryUpdated();
    }
  };

  const handleDeleteActivity = async (actId: string) => {
    if (!window.confirm('¿Deseas eliminar esta actividad del itinerario?')) return;
    const updatedDay = {
      ...currentDay,
      activities: currentDay.activities.filter((a) => a.id !== actId),
    };
    await updateItineraryDay(updatedDay);
    onItineraryUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Trip Overview */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-teal-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-orange-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Itinerario Oficial del Viaje
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            10 Días de Aventura Caribeña
          </h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-0.5 max-w-xl">
            Del 9 al 18 de octubre de 2026. Selecciona cualquier día del calendario interactivo para consultar las paradas, el hospedaje y el presupuesto estimado.
          </p>
        </div>

        <div className="bg-black/20 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 shrink-0 self-stretch sm:self-auto text-right sm:text-left">
          <p className="text-[11px] text-amber-200 uppercase font-semibold">
            Presupuesto Diario Total Estimado
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-white">
            {formatCOP(totalTripBudget)}
          </p>
          <p className="text-[10px] text-white/70">
            Suma sugerida por persona para todo el recorrido
          </p>
        </div>
      </div>

      {/* Interactive Calendar Strip (Days 1-10) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Calendario Interactivo (9 al 18 de Octubre)
          </span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Haz clic en un día para abrir su plan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {itinerary.map((day) => {
            const isSelected = day.dayNumber === selectedDayNumber;
            const cityBadge = CITY_BADGES[day.city] || { bg: 'bg-slate-100', text: 'text-slate-800', icon: '📍', border: 'border-slate-200' };
            const dayMonth = day.date.includes('Octubre') ? day.date.split('de')[0].trim() : `Oct ${day.dayNumber + 8}`;

            return (
              <button
                key={day.dayNumber}
                id={`calendar-day-btn-${day.dayNumber}`}
                onClick={() => setSelectedDayNumber(day.dayNumber)}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all text-center cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-500/20 scale-[1.02]'
                    : 'bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                )}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Día {day.dayNumber}
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-0.5">
                  {day.dayNumber + 8} Oct
                </span>
                <span className={`mt-1 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${cityBadge.bg} ${cityBadge.text}`}>
                  <span>{cityBadge.icon}</span>
                  <span className="truncate max-w-[65px]">{day.city}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day View */}
      {currentDay && (
        <div className="bg-white rounded-3xl border border-amber-100/90 shadow-sm p-5 sm:p-8 space-y-6">
          {/* Day Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900 text-white tracking-wide">
                  DÍA {currentDay.dayNumber}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {currentDay.date}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${CITY_BADGES[currentDay.city]?.bg || 'bg-slate-100'} ${CITY_BADGES[currentDay.city]?.text || 'text-slate-800'}`}>
                  {CITY_BADGES[currentDay.city]?.icon} {currentDay.city}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentDay.title}
              </h3>
              <p className="text-sm text-slate-600 mt-1 italic">
                "{currentDay.tagline}"
              </p>
            </div>

            {/* Day Switcher controls & Admin Edit */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                id="btn-prev-day"
                onClick={() => setSelectedDayNumber(Math.max(1, currentDay.dayNumber - 1))}
                disabled={currentDay.dayNumber <= 1}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-next-day"
                onClick={() => setSelectedDayNumber(Math.min(10, currentDay.dayNumber + 1))}
                disabled={currentDay.dayNumber >= 10}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {isAdmin && (
                <button
                  id="btn-edit-current-day"
                  onClick={handleStartEditDay}
                  className="px-3 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-teal-600" />
                  Editar Día
                </button>
              )}
            </div>
          </div>

          {/* Three Key Info Cards: Lodging, Transport, Budget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lodging */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-2">
                <Building className="w-4 h-4 text-amber-700" />
                Hospedaje Oficial
              </div>
              <p className="text-sm font-bold text-slate-900">
                {currentDay.lodging || 'Por coordinar'}
              </p>
              {currentDay.lodgingNotes && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {currentDay.lodgingNotes}
                </p>
              )}
            </div>

            {/* Transport */}
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-xs uppercase tracking-wider mb-2">
                <Bus className="w-4 h-4 text-teal-700" />
                Transporte Previsto
              </div>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {currentDay.transport || 'Transporte local a pie'}
              </p>
            </div>

            {/* Estimated Budget */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                Presupuesto Estimado / Día
              </div>
              <p className="text-lg font-extrabold text-emerald-900">
                {formatCOP(currentDay.estimatedBudgetCOP)}
              </p>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">
                Estimado por persona (comidas, entradas, traslados)
              </p>
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-orange-500" />
                Plan y Lugares a Visitar ({currentDay.activities.length})
              </h4>
              {isAdmin && (
                <button
                  id="btn-add-activity-open"
                  onClick={() => setIsAddingActivity(!isAddingActivity)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Actividad
                </button>
              )}
            </div>

            {/* Add Activity Inline Form (Admin) */}
            {isAddingActivity && isAdmin && (
              <form onSubmit={handleAddActivity} className="p-4 bg-orange-50/50 border border-orange-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-950 uppercase">Nueva actividad para el Día {currentDay.dayNumber}</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingActivity(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newActTitle}
                    onChange={(e) => setNewActTitle(e.target.value)}
                    placeholder="Título de la actividad (ej. Almuerzo en Caimán del Río)"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <input
                    type="text"
                    value={newActTime}
                    onChange={(e) => setNewActTime(e.target.value)}
                    placeholder="Horario (ej. 01:00 PM - 03:00 PM)"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={newActCategory}
                    onChange={(e) => setNewActCategory(e.target.value as ActivityCategory)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="visita">Visita / Recorrido</option>
                    <option value="comida">Comida / Restaurante</option>
                    <option value="playa">Playa / Mar</option>
                    <option value="naturaleza">Naturaleza / Selva</option>
                    <option value="rumba">Rumba / Noche</option>
                    <option value="transporte">Transporte</option>
                    <option value="hospedaje">Hospedaje</option>
                  </select>
                  <input
                    type="number"
                    value={newActCost}
                    onChange={(e) => setNewActCost(e.target.value)}
                    placeholder="Costo estimado en COP (ej. 45000)"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={newActLocation}
                    onChange={(e) => setNewActLocation(e.target.value)}
                    placeholder="Lugar / Ubicación (ej. Gran Malecón)"
                    className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <textarea
                    value={newActDesc}
                    onChange={(e) => setNewActDesc(e.target.value)}
                    placeholder="Descripción y recomendaciones para el grupo..."
                    rows={2}
                    className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingActivity(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-200/70"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-sm hover:bg-orange-700"
                  >
                    Guardar Actividad
                  </button>
                </div>
              </form>
            )}

            {/* List of activities */}
            <div className="space-y-3">
              {currentDay.activities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No hay actividades registradas aún para este día.
                </div>
              ) : (
                currentDay.activities.map((act, index) => {
                  const catStyle = CATEGORY_COLORS[act.category] || { bg: 'bg-slate-100', text: 'text-slate-800' };
                  return (
                    <div
                      key={act.id || index}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-orange-500" />
                            {act.time}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.text}`}>
                            {act.category}
                          </span>
                          {act.location && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3 text-teal-600" />
                              {act.location}
                            </span>
                          )}
                        </div>

                        <h5 className="text-sm sm:text-base font-bold text-slate-900">
                          {act.title}
                        </h5>

                        {act.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {act.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center sm:flex-col items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                        {act.costEstimateCOP !== undefined && act.costEstimateCOP > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Aprox. p/p</span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                              {formatCOP(act.costEstimateCOP)}
                            </span>
                          </div>
                        )}

                        {isAdmin && (
                          <button
                            id={`btn-delete-act-${act.id}`}
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Interactive Map Section: Ruta en Mapa & Paradas */}
          <DayMapView
            dayNumber={currentDay.dayNumber}
            cityName={currentDay.city}
            onProposeChange={(day) => handleOpenProposal(day)}
          />
        </div>
      )}

      {/* Edit Day Modal (Admin) */}
      {isEditingDay && editingDayData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Editar Día {editingDayData.dayNumber}: {editingDayData.city}
              </h3>
              <button
                onClick={() => setIsEditingDay(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDayEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título del Día</label>
                <input
                  type="text"
                  value={editingDayData.title}
                  onChange={(e) => setEditingDayData({ ...editingDayData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Frase / Tagline</label>
                <input
                  type="text"
                  value={editingDayData.tagline}
                  onChange={(e) => setEditingDayData({ ...editingDayData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad</label>
                  <select
                    value={editingDayData.city}
                    onChange={(e) => setEditingDayData({ ...editingDayData, city: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  >
                    <option value="Medellín">Medellín</option>
                    <option value="Cartagena">Cartagena</option>
                    <option value="Barranquilla">Barranquilla</option>
                    <option value="Santa Marta">Santa Marta</option>
                    <option value="Palomino">Palomino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Presupuesto Estimado (COP)</label>
                  <input
                    type="number"
                    value={editingDayData.estimatedBudgetCOP}
                    onChange={(e) => setEditingDayData({ ...editingDayData, estimatedBudgetCOP: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hospedaje</label>
                <input
                  type="text"
                  value={editingDayData.lodging}
                  onChange={(e) => setEditingDayData({ ...editingDayData, lodging: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas de Hospedaje</label>
                <textarea
                  value={editingDayData.lodgingNotes || ''}
                  onChange={(e) => setEditingDayData({ ...editingDayData, lodgingNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transporte</label>
                <input
                  type="text"
                  value={editingDayData.transport}
                  onChange={(e) => setEditingDayData({ ...editingDayData, transport: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingDay(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md hover:bg-teal-700"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Proposal Modal (Triggered by Map CTA) */}
      {isProposalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Proponer Actividad o Cambio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Para el Día {proposalDayNumber} ({itinerary.find((d) => d.dayNumber === proposalDayNumber)?.city || currentDay.city})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProposalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {proposalSuccessMsg ? (
              <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-emerald-900">
                  ¡Sugerencia Enviada con Éxito!
                </h4>
                <p className="text-xs text-emerald-700">
                  Tu propuesta para el Día {proposalDayNumber} ha quedado registrada en el buzón grupal para votación.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProposal} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título de la Parada o Cambio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    placeholder="Ej. Parada en Café de las Sombrillas / Snorkel extra"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={proposalCategory}
                      onChange={(e) => setProposalCategory(e.target.value as SuggestionCategory)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="actividad">Actividad / Visita</option>
                      <option value="restaurante">Restaurante / Comida</option>
                      <option value="playa">Playa / Mar</option>
                      <option value="transporte alterno">Transporte alterno</option>
                      <option value="rumba/noche">Rumba / Noche</option>
                      <option value="hospedaje">Hospedaje</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Costo Estimado (COP) <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="number"
                      value={proposalCost}
                      onChange={(e) => setProposalCost(e.target.value)}
                      placeholder="Ej. 45000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción / Razones para el grupo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={proposalDesc}
                    onChange={(e) => setProposalDesc(e.target.value)}
                    rows={3}
                    placeholder="Explica qué haríamos, cómo llegar y por qué vale la pena cambiar o sumar este punto..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {onNavigateToSuggestions && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProposalModalOpen(false);
                        onNavigateToSuggestions(proposalDayNumber);
                      }}
                      className="text-xs text-orange-600 font-bold hover:underline"
                    >
                      Ver todas las propuestas →
                    </button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsProposalModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingProposal}
                      className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmittingProposal ? 'Enviando...' : 'Enviar Propuesta'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
