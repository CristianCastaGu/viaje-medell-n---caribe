import React, { useState } from 'react';
import { AlertTriangle, Calendar, Plus, Trash2 } from 'lucide-react';
import { TripState, Suggestion, ActiveTab } from '../types';
import { formatCOP, formatDateEs, calculatePairwiseNet } from '../utils/debts';
import { updateSuggestionStatus, updatePollStatus, resetTripData, createTravelerAsAdmin, deleteTraveler } from '../api';
import { Button, EmptyState, Field, Modal, Surface, inputCls } from './ui';
import { useLang } from '../lib/i18n';

const QUICK_AVATARS = ['🌴', '🌺', '☕', '🌊', '🧗', '🦜', '🏖️', '🎒', '🕶️', '🛶'];

interface AdminDashboardProps {
  tripState: TripState;
  onRefresh: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onToggleAutoApprove: (val: boolean) => void;
}

type SubTab = 'resumen' | 'sugerencias' | 'encuestas' | 'viajeros' | 'ajustes';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'resumen', label: 'Vista consolidada' },
  { id: 'sugerencias', label: 'Bandeja de sugerencias' },
  { id: 'encuestas', label: 'Gestión de encuestas' },
  { id: 'viajeros', label: 'Viajeros' },
  { id: 'ajustes', label: 'Ajustes' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tripState,
  onRefresh,
  onSelectTab,
  onToggleAutoApprove,
}) => {
  const { t } = useLang();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('resumen');
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [isAddingTraveler, setIsAddingTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [newTravelerAvatar, setNewTravelerAvatar] = useState(QUICK_AVATARS[0]);
  const [travelerError, setTravelerError] = useState('');
  const [isSavingTraveler, setIsSavingTraveler] = useState(false);

  const { travelers, suggestions, polls, loans, itinerary, config } = tripState;

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pendiente');
  const activePolls = polls.filter((p) => p.status === 'activa');
  const pendingPolls = polls.filter((p) => p.status === 'pendiente');
  const totalTripBudget = itinerary.reduce((acc, d) => acc + (d.estimatedBudgetCOP || 0), 0);
  const totalLoansAmount = loans.filter((l) => !l.settled).reduce((acc, l) => acc + l.amount, 0);
  const pairwiseDebts = calculatePairwiseNet(loans);

  const flash = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 4000);
  };

  const handleAddTraveler = async () => {
    if (!newTravelerName.trim()) return;
    setIsSavingTraveler(true);
    setTravelerError('');
    const result = await createTravelerAsAdmin(newTravelerName.trim(), newTravelerAvatar);
    setIsSavingTraveler(false);
    if (result.success) {
      setNewTravelerName('');
      setIsAddingTraveler(false);
      flash(`"${newTravelerName.trim()}" se agregó al grupo.`);
      onRefresh();
    } else {
      setTravelerError(result.error || 'No se pudo agregar.');
    }
  };

  const handleDeleteTraveler = async (id: string, name: string) => {
    if (!window.confirm(`¿Quitar a "${name}" del grupo? Sus sugerencias, votos y préstamos ya registrados no se borran.`)) return;
    if (await deleteTraveler(id)) {
      flash(`"${name}" se quitó del grupo.`);
      onRefresh();
    }
  };

  const handleQuickApproveSug = async (sug: Suggestion) => {
    const targetDay = sug.dayNumber || 1;
    await updateSuggestionStatus(sug.id, 'aprobada', 'Aprobado por el administrador', true, targetDay);
    flash(`"${sug.title}" aprobada e integrada al Día ${targetDay}.`);
    onRefresh();
  };
  const handleQuickDiscardSug = async (sugId: string) => {
    if (!window.confirm('¿Descartar esta sugerencia?')) return;
    await updateSuggestionStatus(sugId, 'descartada');
    flash('Sugerencia descartada.');
    onRefresh();
  };
  const handleQuickApprovePoll = async (pollId: string) => {
    await updatePollStatus(pollId, 'activa');
    flash('Encuesta aprobada y publicada.');
    onRefresh();
  };
  const handleResetToDefaults = async () => {
    if (resetConfirmText !== 'adminSabana') {
      alert('Contraseña incorrecta.');
      return;
    }
    setIsResetting(true);
    await resetTripData('adminSabana');
    setIsResetting(false);
    setShowResetModal(false);
    setResetConfirmText('');
    flash('¡Datos restablecidos al plan original del viaje!');
    onRefresh();
  };

  const metrics = [
    { label: 'Viajeros', value: travelers.length, sub: 'Ingresados con apodo' },
    {
      label: 'Sugerencias',
      value: pendingSuggestions.length,
      sub: 'Pendientes de revisión',
      highlight: pendingSuggestions.length > 0,
    },
    {
      label: 'Encuestas',
      value: activePolls.length,
      sub: pendingPolls.length > 0 ? `${pendingPolls.length} por aprobar` : 'En votación',
    },
    { label: 'Presupuesto', value: formatCOP(totalTripBudget), sub: 'Estimado por persona, 10 días' },
    { label: 'Préstamos', value: formatCOP(totalLoansAmount), sub: 'Deuda activa total' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h2 className="text-[28px] font-bold tracking-[-0.03em] text-ink">{t('admin_title')}</h2>
          <p className="text-ink2 text-sm mt-1 max-w-xl">{t('admin_lead')}</p>
        </div>
        <Button onClick={() => onSelectTab('itinerario')}>
          <Calendar className="w-4 h-4" /> {t('admin_edit_route')}
        </Button>
      </div>

      {actionFeedback && (
        <div className="p-3.5 bg-ok/10 border border-ok/30 rounded-xl text-ok text-sm font-semibold mb-5">
          {actionFeedback}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="border-t-[3px] border-ink pt-3">
            <b className={`block text-2xl tracking-[-0.02em] ${m.highlight ? 'text-bad' : 'text-ink'}`}>
              {m.value}
            </b>
            <span className="text-ink2 text-xs">{m.sub}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line pb-2 mb-6">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id ? 'bg-ink text-bg' : 'text-ink2 hover:bg-soft'
            }`}
          >
            {tab.label}
            {tab.id === 'sugerencias' && pendingSuggestions.length > 0 && ` (${pendingSuggestions.length})`}
            {tab.id === 'encuestas' && pendingPolls.length > 0 && ` (${pendingPolls.length})`}
            {tab.id === 'viajeros' && ` (${travelers.length})`}
          </button>
        ))}
      </div>

      {activeSubTab === 'resumen' && (
        <div className="grid gap-5">
          {pendingSuggestions.length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap bg-baq/10 border border-baq/30 rounded-xl px-4 py-3.5">
              <p className="text-sm text-ink">
                Tienes <b>{pendingSuggestions.length}</b>{' '}
                {pendingSuggestions.length === 1 ? 'sugerencia pendiente' : 'sugerencias pendientes'}.
              </p>
              <Button size="sm" onClick={() => setActiveSubTab('sugerencias')}>
                Revisar →
              </Button>
            </div>
          )}
          <Surface>
            <div className="flex justify-between items-center gap-3 mb-3">
              <h3 className="font-bold text-ink">Deudas del grupo (saldo neto)</h3>
              <button
                onClick={() => onSelectTab('prestamos')}
                className="text-sm font-semibold text-pal hover:underline cursor-pointer"
              >
                Ver todos →
              </button>
            </div>
            {pairwiseDebts.length === 0 ? (
              <p className="text-sm text-ink2 text-center py-4">No hay deudas activas.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {pairwiseDebts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 bg-soft rounded-xl px-3.5 py-2.5">
                    <span className="text-sm text-ink">
                      <b>{s.from}</b> <span className="text-ink2 text-xs">le debe a</span> <b>{s.to}</b>
                    </span>
                    <span className="font-bold text-ink bg-surface border border-line px-2.5 py-0.5 rounded-lg text-sm">
                      {formatCOP(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Surface>
        </div>
      )}

      {activeSubTab === 'sugerencias' && (
        <Surface>
          <h3 className="font-bold text-ink mb-1">Bandeja de moderación</h3>
          <p className="text-sm text-ink2 mb-4">
            Al aprobar, la sugerencia se suma automáticamente al día indicado del itinerario.
          </p>
          {suggestions.length === 0 ? (
            <EmptyState>No hay sugerencias registradas por el grupo aún.</EmptyState>
          ) : (
            <div className="grid gap-2.5">
              {suggestions.map((sug) => {
                const isPending = sug.status === 'pendiente';
                return (
                  <div
                    key={sug.id}
                    className={`flex flex-col sm:flex-row items-start justify-between gap-3 border-b border-line py-3 ${!isPending && sug.status === 'descartada' ? 'opacity-50' : ''}`}
                  >
                    <div>
                      <p className="text-xs text-ink2">
                        {sug.category} · Día {sug.dayNumber ?? '—'} {sug.city ? `(${sug.city})` : ''} ·{' '}
                        {sug.status.toUpperCase()}
                      </p>
                      <h4 className="font-bold text-ink text-sm">{sug.title}</h4>
                      <p className="text-xs text-ink2">{sug.description}</p>
                      <p className="text-[11px] text-ink2 mt-0.5">
                        {sug.proposerName} · {formatDateEs(sug.createdAt)}
                        {sug.estimatedCostCOP ? ` · ${formatCOP(sug.estimatedCostCOP)}` : ''}
                      </p>
                    </div>
                    {isPending && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleQuickApproveSug(sug)}>
                          Aprobar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleQuickDiscardSug(sug.id)}>
                          Descartar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      )}

      {activeSubTab === 'encuestas' && (
        <Surface>
          <div className="flex justify-between items-center gap-3 mb-4">
            <h3 className="font-bold text-ink">Encuestas oficiales y propuestas</h3>
            <button
              onClick={() => onSelectTab('encuestas')}
              className="text-sm font-semibold text-pal hover:underline cursor-pointer"
            >
              Ir a Votar →
            </button>
          </div>
          <div className="grid gap-2.5">
            {polls.map((poll) => (
              <div key={poll.id} className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b border-line py-3">
                <div>
                  <p className="text-xs text-ink2">
                    {poll.status.toUpperCase()} · Por {poll.createdBy}
                  </p>
                  <h4 className="font-bold text-ink text-sm">{poll.question}</h4>
                  <p className="text-xs text-ink2">
                    {poll.options.map((o) => `${o.text} (${o.votes.length})`).join(' · ')}
                  </p>
                </div>
                <div className="shrink-0">
                  {poll.status === 'pendiente' && (
                    <Button size="sm" onClick={() => handleQuickApprovePoll(poll.id)}>
                      Aprobar
                    </Button>
                  )}
                  {poll.status === 'activa' && (
                    <Button size="sm" variant="ghost" onClick={() => updatePollStatus(poll.id, 'cerrada').then(onRefresh)}>
                      Cerrar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {activeSubTab === 'viajeros' && (
        <Surface>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-bold text-ink">Aventureros registrados ({travelers.length})</h3>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingTraveler((v) => !v)}>
              <Plus className="w-3.5 h-3.5" /> Agregar viajero
            </Button>
          </div>

          {isAddingTraveler && (
            <div className="bg-soft rounded-xl p-3.5 grid gap-2.5 mb-4">
              <Field label="Nombre">
                <input
                  value={newTravelerName}
                  onChange={(e) => setNewTravelerName(e.target.value)}
                  placeholder="Nombre o apodo"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {QUICK_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewTravelerAvatar(emoji)}
                    className={`h-10 text-lg rounded-lg border-[1.5px] cursor-pointer ${
                      newTravelerAvatar === emoji ? 'bg-surface border-ink' : 'bg-surface/60 border-line'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {travelerError && <p className="text-xs text-bad">{travelerError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTraveler} disabled={isSavingTraveler || !newTravelerName.trim()}>
                  {isSavingTraveler ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingTraveler(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {travelers.length === 0 ? (
            <EmptyState>Todavía nadie se ha unido con su nombre.</EmptyState>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {travelers.map((trav) => (
                <div key={trav.id} className="flex items-center gap-3 bg-soft rounded-xl px-3.5 py-2.5">
                  <span className="text-xl">{trav.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-ink text-sm truncate">{trav.name}</h4>
                    <p className="text-[11px] text-ink2">{formatDateEs(trav.joinedAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTraveler(trav.id, trav.name)}
                    className="text-ink2 hover:text-bad p-1 cursor-pointer shrink-0"
                    title="Quitar del grupo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Surface>
      )}

      {activeSubTab === 'ajustes' && (
        <div className="grid gap-4">
          <Surface className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-ink text-sm">Aprobación automática de encuestas</p>
              <p className="text-xs text-ink2">
                Si está activa, las encuestas del grupo se publican de inmediato sin tu visto bueno.
              </p>
            </div>
            <Button onClick={() => onToggleAutoApprove(!config.autoApprovePolls)}>
              {config.autoApprovePolls ? 'Desactivar' : 'Activar'}
            </Button>
          </Surface>

          <Surface className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-bad/30 bg-bad/5">
            <div>
              <p className="flex items-center gap-1.5 font-bold text-bad text-sm">
                <AlertTriangle className="w-4 h-4" /> Restablecer datos a estado inicial
              </p>
              <p className="text-xs text-ink2 mt-0.5">
                Borra sugerencias, votos, préstamos y viajeros; vuelve a cargar el itinerario original.
              </p>
            </div>
            <Button variant="danger" onClick={() => setShowResetModal(true)}>
              Restablecer
            </Button>
          </Surface>
        </div>
      )}

      {showResetModal && (
        <Modal title="¿Restablecer datos del viaje?" onClose={() => setShowResetModal(false)}>
          <p className="text-sm text-ink2">
            Para confirmar, escribe la contraseña de administrador.
          </p>
          <input
            type="password"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            className="w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowResetModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleResetToDefaults}
              disabled={isResetting || resetConfirmText !== 'adminSabana'}
            >
              {isResetting ? 'Restableciendo...' : 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
