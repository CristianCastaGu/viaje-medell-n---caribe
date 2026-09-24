import React, { useState } from 'react';
import { Plus, X, CheckCircle2, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { Poll, Traveler } from '../types';
import { formatDateEs } from '../utils/debts';
import { createPoll, voteOnPoll, updatePollStatus } from '../api';
import { Button, Chip, EmptyState, Field, SectionHeader, Surface, inputCls } from './ui';

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
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const handleAddOptionField = () => options.length < 6 && setOptions([...options, '']);
  const handleRemoveOptionField = (idx: number) =>
    options.length > 2 && setOptions(options.filter((_, i) => i !== idx));
  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !currentUser) return;
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
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

  const handleToggleStatus = async (pollId: string, status: 'activa' | 'cerrada' | 'pendiente') => {
    await updatePollStatus(pollId, status === 'activa' ? 'cerrada' : 'activa');
    onRefresh();
  };
  const handleApprovePoll = async (pollId: string) => {
    await updatePollStatus(pollId, 'activa');
    onRefresh();
  };
  const handleDiscardPoll = async (pollId: string) => {
    if (!window.confirm('¿Descartar esta propuesta de encuesta?')) return;
    await updatePollStatus(pollId, 'descartada');
    onRefresh();
  };

  const visiblePolls = polls.filter((p) => {
    if (p.status === 'descartada') return false;
    if (isAdmin) return true;
    if (p.status === 'activa' || p.status === 'cerrada') return true;
    if (currentUser && p.createdBy === currentUser.name) return true;
    return false;
  });

  return (
    <div>
      <SectionHeader
        title="Votaciones"
        lead="Elige una opción y listo: tu voto queda contado en el momento."
        actions={
          <Button onClick={() => setIsFormOpen((v) => !v)}>
            <Plus className="w-4 h-4" /> Proponer encuesta
          </Button>
        }
      />

      {feedbackMsg && (
        <div className="p-3.5 bg-ok/10 border border-ok/30 rounded-xl text-ok text-sm font-semibold mb-4">
          {feedbackMsg}
        </div>
      )}

      {isAdmin && onToggleAutoApprove && (
        <div className="flex items-center justify-between gap-3 text-sm bg-soft rounded-xl px-4 py-3 mb-4">
          <span className="text-ink2">
            Aprobación automática de encuestas del grupo:{' '}
            <b className="text-ink">{autoApprovePolls ? 'activa' : 'inactiva'}</b>
          </span>
          <button
            onClick={() => onToggleAutoApprove(!autoApprovePolls)}
            className="flex items-center gap-1.5 text-ink font-semibold cursor-pointer"
          >
            {autoApprovePolls ? (
              <ToggleRight className="w-6 h-6 text-med" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-ink2" />
            )}
          </button>
        </div>
      )}

      {isFormOpen && (
        <Surface className="mb-6 grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink">
              {isAdmin ? 'Crear una encuesta' : 'Proponer una encuesta'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-ink2 hover:text-ink cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreatePoll} className="grid gap-3">
            <Field label="Pregunta">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ej. ¿Dónde almorzamos el martes?"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Contexto (opcional)">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notas adicionales..."
                className={inputCls}
              />
            </Field>
            <div className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Opciones (mínimo 2)</span>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Opción ${idx + 1}`}
                    className={inputCls}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionField(idx)}
                      className="text-ink2 hover:text-bad p-1.5 cursor-pointer"
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
                  className="text-sm font-semibold text-ink2 hover:text-ink flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar opción
                </button>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <p className="text-xs text-ink2">
                {isAdmin
                  ? 'Se publica de inmediato.'
                  : autoApprovePolls
                    ? 'Se publicará de inmediato.'
                    : 'Quedará pendiente de aprobación del admin.'}
              </p>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Publicar'}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      {visiblePolls.length === 0 ? (
        <EmptyState>No hay encuestas todavía.</EmptyState>
      ) : (
        <div className="grid gap-4">
          {visiblePolls.map((poll) => {
            const totalVotes = poll.options.reduce((acc, o) => acc + o.votes.length, 0);
            const isPending = poll.status === 'pendiente';
            const isClosed = poll.status === 'cerrada';
            const isActive = poll.status === 'activa';

            return (
              <Surface key={poll.id}>
                <div className="flex justify-between gap-2 flex-wrap items-start mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isActive && <Chip tone="ok">Votación activa</Chip>}
                    {isClosed && <Chip>Cerrada</Chip>}
                    {isPending && (
                      <Chip tone="wait">
                        <Clock className="w-3 h-3" /> Pendiente de aprobación
                      </Chip>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {isPending ? (
                        <>
                          <Button size="sm" onClick={() => handleApprovePoll(poll.id)}>
                            Aprobar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDiscardPoll(poll.id)}>
                            Descartar
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(poll.id, poll.status)}>
                          {isActive ? 'Cerrar' : 'Reabrir'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-ink mb-3">{poll.question}</h3>

                <div className="grid gap-2.5">
                  {poll.options.map((option) => {
                    const n = option.votes.length;
                    const pct = totalVotes ? Math.round((n * 100) / totalVotes) : 0;
                    const isMine = currentUser ? option.votes.includes(currentUser.name) : false;
                    return (
                      <div
                        key={option.id}
                        className={`relative overflow-hidden rounded-xl border-[1.5px] px-3.5 py-3 ${
                          isMine ? 'border-ink border-2' : 'border-line'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-pal/20 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex justify-between items-center gap-3 flex-wrap">
                          <div>
                            <span className="font-semibold text-ink text-sm">{option.text}</span>
                            {option.votes.length > 0 && (
                              <p className="text-xs text-ink2 mt-0.5">{option.votes.join(', ')}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-ink text-sm">
                              {n} · {pct}%
                            </span>
                            {isActive && (
                              <button
                                onClick={() => handleVote(poll.id, option.id)}
                                disabled={votingPollId === poll.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                  isMine ? 'bg-ink text-bg' : 'border border-line text-ink hover:border-ink'
                                }`}
                              >
                                {isMine ? <CheckCircle2 className="w-3.5 h-3.5" /> : 'Votar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-xs text-ink2 mt-3 pt-3 border-t border-line">
                  <span>Propuesta por {poll.createdBy}</span>
                  <span>{formatDateEs(poll.createdAt)}</span>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
};
