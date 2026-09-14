import React, { useState } from 'react';
import { 
  ShieldCheck, Users, Lightbulb, Vote, Coins, DollarSign, Calendar, 
  CheckCircle, XCircle, RotateCcw, AlertTriangle, ArrowRight, Sparkles,
  Edit2, Trash2, Sliders, Check
} from 'lucide-react';
import { TripState, Suggestion, Poll, Loan, ItineraryDay } from '../types';
import { formatCOP, formatDateEs, calculatePairwiseNet } from '../utils/debts';
import { updateSuggestionStatus, updatePollStatus, resetTripData } from '../api';

interface AdminDashboardProps {
  tripState: TripState;
  onRefresh: () => void;
  onSelectTab: (tab: any) => void;
  onToggleAutoApprove: (val: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tripState,
  onRefresh,
  onSelectTab,
  onToggleAutoApprove,
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'resumen' | 'sugerencias' | 'encuestas' | 'viajeros' | 'ajustes'>('resumen');
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const { travelers, suggestions, polls, loans, itinerary, config } = tripState;

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pendiente');
  const activePolls = polls.filter((p) => p.status === 'activa');
  const pendingPolls = polls.filter((p) => p.status === 'pendiente');
  
  const totalTripBudget = itinerary.reduce((acc, d) => acc + (d.estimatedBudgetCOP || 0), 0);
  const totalLoansAmount = loans.filter((l) => !l.settled).reduce((acc, l) => acc + l.amount, 0);

  const pairwiseDebts = calculatePairwiseNet(loans);

  const handleQuickApproveSug = async (sug: Suggestion) => {
    const targetDay = sug.dayNumber || 1;
    await updateSuggestionStatus(sug.id, 'aprobada', 'Aprobado por el Administrador', true, targetDay);
    setActionFeedback(`Sugerencia "${sug.title}" aprobada e integrada al Día ${targetDay}.`);
    setTimeout(() => setActionFeedback(''), 4000);
    onRefresh();
  };

  const handleQuickDiscardSug = async (sugId: string) => {
    if (!window.confirm('¿Descartar esta sugerencia?')) return;
    await updateSuggestionStatus(sugId, 'descartada');
    setActionFeedback('Sugerencia descartada.');
    setTimeout(() => setActionFeedback(''), 4000);
    onRefresh();
  };

  const handleQuickApprovePoll = async (pollId: string) => {
    await updatePollStatus(pollId, 'activa');
    setActionFeedback('Encuesta aprobada y publicada para el grupo.');
    setTimeout(() => setActionFeedback(''), 4000);
    onRefresh();
  };

  const handleResetToDefaults = async () => {
    if (resetConfirmText !== 'adminSabana') {
      alert('Contraseña incorrecta para restablecer datos.');
      return;
    }
    setIsResetting(true);
    await resetTripData('adminSabana');
    setIsResetting(false);
    setShowResetModal(false);
    setResetConfirmText('');
    setActionFeedback('¡Datos restablecidos al estado inicial del viaje!');
    setTimeout(() => setActionFeedback(''), 4000);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-teal-800/40">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Centro de Mando Oficial
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Panel de Administración del Viaje
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Control de itinerario, moderación de propuestas del grupo, supervisión de encuestas y consolidado económico en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('itinerario')}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Editar Itinerario
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Summary Metrics Row (Panel Resumen) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Travelers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Viajeros</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{travelers.length}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Ingresados con apodo</p>
          </div>
        </div>

        {/* Metric 2: Pending Suggestions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Sugerencias</span>
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className={`text-2xl font-black ${pendingSuggestions.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {pendingSuggestions.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Pendientes de revisión</p>
          </div>
        </div>

        {/* Metric 3: Active Polls */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Encuestas</span>
            <Vote className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{activePolls.length}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pendingPolls.length > 0 ? `(${pendingPolls.length} por aprobar)` : 'En votación'}
            </p>
          </div>
        </div>

        {/* Metric 4: Total Itinerary Budget */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Presupuesto</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-lg font-black text-emerald-700 block leading-tight">
              {formatCOP(totalTripBudget)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Total p/p 10 días</p>
          </div>
        </div>

        {/* Metric 5: Active Loans */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Préstamos</span>
            <Coins className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 block leading-tight">
              {formatCOP(totalLoansAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Deuda activa total</p>
          </div>
        </div>
      </div>

      {/* Admin Subtabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveAdminSubTab('resumen')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeAdminSubTab === 'resumen'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Vista Consolidada
        </button>
        <button
          onClick={() => setActiveAdminSubTab('sugerencias')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
            activeAdminSubTab === 'sugerencias'
              ? 'bg-amber-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Bandeja Sugerencias</span>
          {pendingSuggestions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-extrabold">
              {pendingSuggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveAdminSubTab('encuestas')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
            activeAdminSubTab === 'encuestas'
              ? 'bg-teal-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Gestión Encuestas</span>
          {pendingPolls.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-600 text-white font-extrabold">
              {pendingPolls.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveAdminSubTab('viajeros')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeAdminSubTab === 'viajeros'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Viajeros ({travelers.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('ajustes')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
            activeAdminSubTab === 'ajustes'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Ajustes
        </button>
      </div>

      {/* Subtab 1: Vista Consolidada */}
      {activeAdminSubTab === 'resumen' && (
        <div className="space-y-6">
          {/* Quick Pending Actions Alerts */}
          {pendingSuggestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Tienes {pendingSuggestions.length} {pendingSuggestions.length === 1 ? 'sugerencia pendiente' : 'sugerencias pendientes'} por revisar
                  </h4>
                  <p className="text-xs text-amber-800">
                    Aprueba para integrarlas directamente al día correspondiente del itinerario.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAdminSubTab('sugerencias')}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                Revisar Bandeja →
              </button>
            </div>
          )}

          {/* Consolidated Debt Matrix / Net balances */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Resumen Consolidado de Deudas del Grupo
                </h3>
                <p className="text-xs text-slate-500">
                  Liquidación neta automática tipo Splitwise calculada entre todos los aventureros.
                </p>
              </div>
              <button
                onClick={() => onSelectTab('prestamos')}
                className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
              >
                Ver todos los registros →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pairwiseDebts.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-slate-400 text-xs italic">
                  No hay deudas activas en el grupo.
                </div>
              ) : (
                pairwiseDebts.map((settle, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900">
                        {settle.from}
                      </span>
                      <span className="text-xs text-slate-400 mx-1.5">le debe a</span>
                      <span className="text-xs font-extrabold text-emerald-800">
                        {settle.to}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {formatCOP(settle.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Bandeja de Sugerencias */}
      {activeAdminSubTab === 'sugerencias' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Bandeja de Moderación de Sugerencias
              </h3>
              <p className="text-xs text-slate-500">
                Al hacer clic en "Aprobar", la sugerencia se suma automáticamente al cronograma oficial del día indicado.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs italic">
                No hay sugerencias registradas por el grupo aún.
              </p>
            ) : (
              suggestions.map((sug) => {
                const isPending = sug.status === 'pendiente';
                const isApproved = sug.status === 'aprobada';

                return (
                  <div
                    key={sug.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start justify-between gap-3 ${
                      isApproved
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isPending
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                          {sug.category}
                        </span>
                        {sug.dayNumber && (
                          <span className="text-xs font-semibold text-slate-600">
                            Día {sug.dayNumber} {sug.city ? `(${sug.city})` : ''}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' : isPending ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {sug.status.toUpperCase()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{sug.title}</h4>
                      <p className="text-xs text-slate-600">{sug.description}</p>
                      
                      <p className="text-[11px] text-slate-400 pt-1">
                        Propuesto por: <strong>{sug.proposerName}</strong> • {formatDateEs(sug.createdAt)}
                        {sug.estimatedCostCOP ? ` • Presupuesto: ${formatCOP(sug.estimatedCostCOP)}` : ''}
                      </p>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleQuickApproveSug(sug)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Aprobar e Integrar
                        </button>
                        <button
                          onClick={() => handleQuickDiscardSug(sug.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-xs cursor-pointer"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Gestión de Encuestas */}
      {activeAdminSubTab === 'encuestas' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Encuestas Oficiales y Propuestas
              </h3>
              <p className="text-xs text-slate-500">
                Revisa propuestas del grupo o controla el estado de las votaciones en curso.
              </p>
            </div>
            <button
              onClick={() => onSelectTab('encuestas')}
              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              Ir a vista de encuestas →
            </button>
          </div>

          <div className="space-y-3">
            {polls.map((poll) => {
              const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

              return (
                <div key={poll.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        poll.status === 'activa' ? 'bg-teal-100 text-teal-800' : poll.status === 'pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {poll.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">Por {poll.createdBy}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{poll.question}</h4>
                    <div className="text-xs text-slate-500">
                      Opciones: {poll.options.map((o) => `${o.text} (${o.votes.length})`).join(' • ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {poll.status === 'pendiente' && (
                      <button
                        onClick={() => handleQuickApprovePoll(poll.id)}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Aprobar y Publicar
                      </button>
                    )}
                    {poll.status === 'activa' && (
                      <button
                        onClick={() => updatePollStatus(poll.id, 'cerrada').then(onRefresh)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Cerrar Votación
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 4: Viajeros Conectados */}
      {activeAdminSubTab === 'viajeros' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              Aventureros Registrados ({travelers.length})
            </h3>
            <p className="text-xs text-slate-500">
              Personas que han ingresado con su nombre a la sesión general del viaje.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {travelers.map((t) => (
              <div key={t.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-xl flex items-center justify-center border border-slate-200 shadow-2xs">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {t.joinedAt ? formatDateEs(t.joinedAt) : 'Registrado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 5: Ajustes & Restablecer */}
      {activeAdminSubTab === 'ajustes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Ajustes de la Aplicación y Seguridad
            </h3>
            <p className="text-xs text-slate-500">
              Configuraciones avanzadas del viaje grupal.
            </p>
          </div>

          {/* Config row */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Aprobación automática de encuestas del grupo
              </p>
              <p className="text-xs text-slate-500">
                Si está activa, las encuestas propuestas por los viajeros se publican de inmediato sin requerir visto bueno del admin.
              </p>
            </div>
            <button
              onClick={() => onToggleAutoApprove(!config.autoApprovePolls)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer self-start sm:self-auto"
            >
              {config.autoApprovePolls ? 'Desactivar Auto-Aprobación' : 'Activar Auto-Aprobación'}
            </button>
          </div>

          {/* Credentials Summary Box */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Credenciales Configuradas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80">
                <span className="text-slate-500 block">Palabra secreta grupo:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">Desapareceresopcional</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80">
                <span className="text-slate-500 block">Contraseña administrador:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">adminSabana</span>
              </div>
            </div>
          </div>

          {/* Danger zone: Reset */}
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-red-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Restablecer datos a estado inicial
              </div>
              <p className="text-xs text-red-700/80 mt-0.5">
                Restaura el itinerario inicial de 10 días, encuestas de prueba y sugerencias predeterminadas.
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer self-start sm:self-auto"
            >
              Restablecer Datos
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-700 font-bold">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-slate-900">¿Restablecer datos del viaje?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Para confirmar el restablecimiento al estado de fábrica, escribe la contraseña de administrador (<strong>adminSabana</strong>).
            </p>
            <input
              type="password"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="adminSabana"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={isResetting || resetConfirmText !== 'adminSabana'}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {isResetting ? 'Restableciendo...' : 'Confirmar Restablecimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
