import React, { useState } from 'react';
import { 
  Vote, Plus, CheckCircle, CheckCircle2, Clock, Trash2, BarChart3, 
  Users, Sparkles, X, AlertCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Poll, Traveler } from '../types';
import { formatDateEs } from '../utils/debts';
import { createPoll, voteOnPoll, updatePollStatus } from '../api';

interface PollsViewProps {
  polls: Poll[];
  currentUser: Traveler | null;
  isAdmin: boolean;
  autoApprovePolls: boolean;
  onRefresh: () => void;
  onToggleAutoApprove?: (val: boolean) => void;
}

export const PollsView: React.FC<PollsViewProps> = ({
  polls,
  currentUser,
  isAdmin,
  autoApprovePolls,
  onRefresh,
  onToggleAutoApprove,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // New poll form
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Voting loading tracker
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const handleAddOptionField = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOptionField = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !currentUser) return;
    
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      alert('Debes incluir al menos dos opciones para la votación.');
      return;
    }

    setIsSubmitting(true);
    const success = await createPoll({
      question: question.trim(),
      description: description.trim() || undefined,
      options: validOptions,
      createdBy: currentUser.name,
      creatorRole: isAdmin ? 'admin' : 'traveler',
    });
    setIsSubmitting(false);

    if (success) {
      setQuestion('');
      setDescription('');
      setOptions(['', '']);
      setIsFormOpen(false);
      setFeedbackMsg(
        isAdmin || autoApprovePolls
          ? '¡Encuesta creada y publicada para votación!'
          : '¡Encuesta propuesta! Queda pendiente de aprobación del admin.'
      );
      setTimeout(() => setFeedbackMsg(''), 4500);
      onRefresh();
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!currentUser) return;
    setVotingPollId(pollId);
    await voteOnPoll(pollId, optionId, currentUser.name);
    setVotingPollId(null);
    onRefresh();
  };

  const handleToggleStatus = async (pollId: string, currentStatus: 'activa' | 'cerrada' | 'pendiente') => {
    const nextStatus = currentStatus === 'activa' ? 'cerrada' : 'activa';
    await updatePollStatus(pollId, nextStatus);
    onRefresh();
  };

  const handleApprovePoll = async (pollId: string) => {
    await updatePollStatus(pollId, 'activa');
    onRefresh();
  };

  const handleDiscardPoll = async (pollId: string) => {
    if (!window.confirm('¿Deseas descartar esta propuesta de encuesta?')) return;
    await updatePollStatus(pollId, 'descartada');
    onRefresh();
  };

  // Visible polls:
  // Active and closed are visible to all.
  // Pending polls are visible to admin, plus the creator themselves.
  const visiblePolls = polls.filter((p) => {
    if (p.status === 'descartada') return false;
    if (isAdmin) return true;
    if (p.status === 'activa' || p.status === 'cerrada') return true;
    if (currentUser && p.createdBy === currentUser.name) return true;
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-teal-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white mb-2">
            <Vote className="w-3.5 h-3.5" />
            Votaciones en Vivo
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Encuestas y Decisiones Grupales
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm mt-0.5 max-w-xl">
            Vota por los mejores planes o propón una votación para definir actividades, restaurantes o cambios en el viaje en tiempo real.
          </p>
        </div>

        <button
          id="btn-open-poll-form"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-5 py-3 rounded-2xl bg-white text-teal-950 hover:bg-teal-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-teal-600" />
          Proponer Encuesta
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Admin auto-approve toggle banner */}
      {isAdmin && onToggleAutoApprove && (
        <div className="p-3.5 bg-white rounded-2xl border border-teal-100 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-800">
              Aprobación automática de encuestas:
            </span>
            <span className="text-slate-500">
              {autoApprovePolls
                ? 'Cualquier persona puede publicar encuestas directamente'
                : 'Las encuestas del grupo requieren tu visto bueno antes de salir'}
            </span>
          </div>

          <button
            onClick={() => onToggleAutoApprove(!autoApprovePolls)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold cursor-pointer transition-colors"
          >
            {autoApprovePolls ? (
              <>
                <ToggleRight className="w-5 h-5 text-teal-600" />
                <span>Auto-aprobación: Activa</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-400" />
                <span>Auto-aprobación: Inactiva</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Propose Poll Form Card */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl border border-teal-200/80 shadow-md p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">
                Crear Nueva Encuesta
              </h3>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={handleCreatePoll} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pregunta de la Encuesta *
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ej. ¿A dónde vamos el domingo en Cartagena al atardecer?"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contexto o notas adicionales (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Elijamos el plan principal para cerrar la tarde en el Centro Histórico..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Opciones de respuesta (mínimo 2)
              </label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-xs font-bold text-slate-400 text-center">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Opción ${idx + 1}`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionField(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      title="Quitar opción"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOptionField}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 mt-1 pl-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar otra opción
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Creado por: <strong className="text-slate-800">{currentUser?.name}</strong>{' '}
                {isAdmin ? '(Admin)' : autoApprovePolls ? '(Se publicará de inmediato)' : '(Quedará pendiente de aprobación)'}
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
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Publicar Encuesta'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Polls Cards List */}
      <div className="space-y-5">
        {visiblePolls.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
            <Vote className="w-10 h-10 text-teal-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No hay encuestas activas en este momento</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Sé el primero en proponer una votación para el grupo.
            </p>
          </div>
        ) : (
          visiblePolls.map((poll) => {
            const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
            const isPending = poll.status === 'pendiente';
            const isClosed = poll.status === 'cerrada';
            const isActive = poll.status === 'activa';

            // Check what option the current user has voted for
            const userVotedOption = poll.options.find((opt) =>
              currentUser ? opt.votes.includes(currentUser.name) : false
            );

            return (
              <div
                key={poll.id}
                className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/30'
                    : isClosed
                    ? 'border-slate-200 opacity-90'
                    : 'border-teal-100 shadow-sm'
                }`}
              >
                {/* Poll Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                          Votación Activa
                        </span>
                      )}
                      {isClosed && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Votación Cerrada
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendiente de aprobación del Admin
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {formatDateEs(poll.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {poll.question}
                    </h3>

                    {poll.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isPending ? (
                        <>
                          <button
                            id={`btn-approve-poll-${poll.id}`}
                            onClick={() => handleApprovePoll(poll.id)}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                          >
                            Aprobar y Publicar
                          </button>
                          <button
                            id={`btn-discard-poll-${poll.id}`}
                            onClick={() => handleDiscardPoll(poll.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 font-bold text-xs cursor-pointer"
                          >
                            Descartar
                          </button>
                        </>
                      ) : (
                        <button
                          id={`btn-toggle-poll-${poll.id}`}
                          onClick={() => handleToggleStatus(poll.id, poll.status)}
                          className="px-3 py-1 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                        >
                          {isActive ? 'Cerrar Encuesta' : 'Reabrir'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Options List with Progress Bars & Voting Buttons */}
                <div className="space-y-3 pt-1">
                  {poll.options.map((option) => {
                    const voteCount = option.votes.length;
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const isUserPick = currentUser ? option.votes.includes(currentUser.name) : false;

                    return (
                      <div
                        key={option.id}
                        className={`p-3 sm:p-4 rounded-2xl border transition-all relative overflow-hidden ${
                          isUserPick
                            ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500/30'
                            : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {/* Background Progress Fill */}
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-teal-200/25 transition-all duration-500 pointer-events-none"
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {option.text}
                              </span>
                              {isUserPick && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-100 border border-teal-300 px-2 py-0.2 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                  Tu voto
                                </span>
                              )}
                            </div>

                            {/* Voter Avatars / Names */}
                            {option.votes.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[11px] text-slate-500">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="font-medium text-slate-700">
                                  {option.votes.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Stats & Vote Trigger */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-slate-900">
                                {percentage}%
                              </span>
                              <span className="text-[11px] text-slate-500 ml-1">
                                ({voteCount} {voteCount === 1 ? 'voto' : 'votos'})
                              </span>
                            </div>

                            {isActive && !isPending && (
                              <button
                                id={`vote-btn-${poll.id}-${option.id}`}
                                onClick={() => handleVote(poll.id, option.id)}
                                disabled={votingPollId === poll.id}
                                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                  isUserPick
                                    ? 'bg-teal-700 text-white shadow-xs'
                                    : 'bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50'
                                }`}
                              >
                                {isUserPick ? 'Votado ✓' : 'Votar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Poll Footer info */}
                <div className="flex items-center justify-between pt-1 text-xs text-slate-400 border-t border-slate-100">
                  <span>
                    Propuesta por: <strong className="text-slate-600">{poll.createdBy}</strong>
                  </span>
                  <span>
                    Total: <strong className="text-slate-800">{totalVotes}</strong> {totalVotes === 1 ? 'voto registrado' : 'votos registrados'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
