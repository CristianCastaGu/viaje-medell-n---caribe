import React, { useState } from 'react';
import { 
  Lightbulb, Plus, CheckCircle, XCircle, Clock, Send, Sparkles, Filter, 
  MapPin, DollarSign, Calendar, MessageSquare, AlertCircle
} from 'lucide-react';
import { Suggestion, SuggestionCategory, Traveler, ItineraryDay } from '../types';
import { formatCOP, formatDateEs } from '../utils/debts';
import { createSuggestion, updateSuggestionStatus } from '../api';

interface SuggestionsViewProps {
  suggestions: Suggestion[];
  itinerary: ItineraryDay[];
  currentUser: Traveler | null;
  isAdmin: boolean;
  onRefresh: () => void;
}

const CATEGORY_ICONS: Record<SuggestionCategory, string> = {
  restaurante: '🍽️',
  actividad: '🧗',
  hospedaje: '🏨',
  'transporte alterno': '🚐',
  'rumba/noche': '🍹',
  otro: '✨',
};

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  suggestions,
  itinerary,
  currentUser,
  isAdmin,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'aprobadas'>('todas');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // New suggestion form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('actividad');
  const [description, setDescription] = useState('');
  const [dayNumber, setDayNumber] = useState<string>('1');
  const [estimatedCostCOP, setEstimatedCostCOP] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Admin approval modal
  const [approvingSug, setApprovingSug] = useState<Suggestion | null>(null);
  const [targetDay, setTargetDay] = useState<number>(1);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;

    setIsSubmitting(true);
    const day = itinerary.find((d) => d.dayNumber === Number(dayNumber));
    const success = await createSuggestion({
      title: title.trim(),
      category,
      description: description.trim(),
      dayNumber: dayNumber ? Number(dayNumber) : undefined,
      city: day?.city,
      estimatedCostCOP: estimatedCostCOP ? Number(estimatedCostCOP) : undefined,
      proposerId: currentUser.id,
      proposerName: currentUser.name,
    });
    setIsSubmitting(false);

    if (success) {
      setTitle('');
      setDescription('');
      setEstimatedCostCOP('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      setIsFormOpen(false);
      onRefresh();
    }
  };

  const handleOpenApproveModal = (sug: Suggestion) => {
    setApprovingSug(sug);
    setTargetDay(sug.dayNumber || 1);
    setAdminNote('');
  };

  const handleConfirmApprove = async () => {
    if (!approvingSug) return;
    setIsProcessing(true);
    await updateSuggestionStatus(
      approvingSug.id,
      'aprobada',
      adminNote.trim() || undefined,
      true, // addToItinerary = true!
      targetDay
    );
    setIsProcessing(false);
    setApprovingSug(null);
    onRefresh();
  };

  const handleDiscard = async (sugId: string) => {
    if (!window.confirm('¿Descartar esta propuesta?')) return;
    setIsProcessing(true);
    await updateSuggestionStatus(sugId, 'descartada');
    setIsProcessing(false);
    onRefresh();
  };

  // Group members can see approved suggestions and their own submitted pending ones.
  // Admins see all suggestions (including all pending ones from anyone).
  const visibleSuggestions = suggestions.filter((sug) => {
    if (isAdmin) return true;
    if (sug.status === 'aprobada') return true;
    if (currentUser && sug.proposerName === currentUser.name) return true;
    return false;
  });

  const filteredSuggestions = visibleSuggestions.filter((sug) => {
    if (filter === 'pendientes') return sug.status === 'pendiente';
    if (filter === 'aprobadas') return sug.status === 'aprobada';
    return true;
  });

  const pendingCount = visibleSuggestions.filter((s) => s.status === 'pendiente').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-orange-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            Buzón de Ideas del Grupo
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Propón Lugares, Restaurantes y Planes
          </h2>
          <p className="text-orange-100 text-xs sm:text-sm mt-0.5 max-w-xl">
            ¿Viste un restaurante brutal en Cartagena o un tour en Palomino? Envíalo aquí. El administrador revisará las sugerencias y las integrará al itinerario oficial.
          </p>
        </div>

        <button
          id="btn-open-suggestion-form"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-5 py-3 rounded-2xl bg-white text-orange-950 hover:bg-orange-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-orange-600" />
          Proponer una Idea
        </button>
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>¡Tu sugerencia fue enviada con éxito! Queda en estado pendiente de revisión por el administrador.</span>
        </div>
      )}

      {/* Suggestion Form Drawer / Card */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl border border-amber-200/80 shadow-md p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Nueva Propuesta para el Viaje
              </h3>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la propuesta *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Ceviche en La Cevicheria, clase de salsa..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="restaurante">🍽️ Restaurante / Comida</option>
                  <option value="actividad">🧗 Actividad / Tour</option>
                  <option value="hospedaje">🏨 Hospedaje / Alojamiento</option>
                  <option value="transporte alterno">🚐 Transporte alterno</option>
                  <option value="rumba/noche">🍹 Rumba / Bar / Noche</option>
                  <option value="otro">✨ Otro servicio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Día sugerido del viaje
                </label>
                <select
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {itinerary.map((d) => (
                    <option key={d.dayNumber} value={d.dayNumber}>
                      Día {d.dayNumber}: {d.city} ({d.date.split('de')[0].trim()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Presupuesto estimado en COP (Opcional)
                </label>
                <input
                  type="number"
                  value={estimatedCostCOP}
                  onChange={(e) => setEstimatedCostCOP(e.target.value)}
                  placeholder="Ej. 35000"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                ¿Por qué lo recomiendas? / Detalles *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cuenta de qué se trata, ubicación, enlaces o tips especiales..."
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                Se registrará a nombre de: <span className="font-bold text-slate-800">{currentUser?.name}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Sugerencia'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'todas'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({visibleSuggestions.length})
          </button>
          <button
            onClick={() => setFilter('pendientes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === 'pendientes'
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Pendientes</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'pendientes' ? 'bg-white text-amber-600 font-extrabold' : 'bg-amber-100 text-amber-800'}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('aprobadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'aprobadas'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Aprobadas ({visibleSuggestions.filter((s) => s.status === 'aprobada').length})
          </button>
        </div>

        {isAdmin && (
          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg">
            Modo Admin: Tienes botones para aprobar o descartar
          </span>
        )}
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
            <Lightbulb className="w-10 h-10 text-amber-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No hay sugerencias en esta categoría</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Sé el primero en proponer un lugar increíble, restaurante o plan divertido para el viaje.
            </p>
          </div>
        ) : (
          filteredSuggestions.map((sug) => {
            const icon = CATEGORY_ICONS[sug.category] || '✨';
            const isPending = sug.status === 'pendiente';
            const isApproved = sug.status === 'aprobada';
            const isDiscarded = sug.status === 'descartada';

            return (
              <div
                key={sug.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all bg-white ${
                  isApproved
                    ? 'border-emerald-200 shadow-xs'
                    : isPending
                    ? 'border-amber-200 shadow-xs'
                    : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                        {icon} {sug.category}
                      </span>
                      {sug.dayNumber && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          Día {sug.dayNumber} {sug.city ? `• ${sug.city}` : ''}
                        </span>
                      )}
                      {/* Status badge */}
                      {isPending && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendiente de aprobación
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Aprobada en itinerario
                        </span>
                      )}
                      {isDiscarded && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          Descartada
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {sug.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {sug.description}
                    </p>

                    {/* Admin Note if present */}
                    {sug.adminNote && (
                      <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200/80 text-xs text-teal-900 flex items-start gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Nota del Admin: </span>
                          <span>{sug.adminNote}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>Propuesto por <strong className="text-slate-700">{sug.proposerName}</strong></span>
                      <span>•</span>
                      <span>{formatDateEs(sug.createdAt)}</span>
                      {sug.estimatedCostCOP !== undefined && sug.estimatedCostCOP > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-emerald-700">
                            Presupuesto: {formatCOP(sug.estimatedCostCOP)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && isPending && (
                    <div className="flex sm:flex-col items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        id={`btn-approve-sug-${sug.id}`}
                        onClick={() => handleOpenApproveModal(sug)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        id={`btn-discard-sug-${sug.id}`}
                        onClick={() => handleDiscard(sug.id)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Approve Modal */}
      {approvingSug && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Aprobar e Integrar al Itinerario
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Estás aprobando <strong>"{approvingSug.title}"</strong> propuesta por <strong>{approvingSug.proposerName}</strong>. Esta actividad se sumará al día que elijas.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ¿A qué día del itinerario se integra?
                </label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {itinerary.map((d) => (
                    <option key={d.dayNumber} value={d.dayNumber}>
                      Día {d.dayNumber}: {d.city} - {d.date.split('de')[0].trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nota del Admin para el grupo (opcional)
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ej. Excelente idea, ya llamamos para reservar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingSug(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                {isProcessing ? 'Aprobando...' : 'Confirmar e Integrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
