import React, { useState } from 'react';
import { Plus, X, Send, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { Suggestion, SuggestionCategory, Traveler, ItineraryDay } from '../types';
import { formatCOP, formatDateEs } from '../utils/debts';
import { createSuggestion, updateSuggestionStatus } from '../api';
import { Button, Chip, EmptyState, Field, FilterPill, Modal, SectionHeader, Surface, inputCls } from './ui';
import { useLang } from '../lib/i18n';

interface SuggestionsViewProps {
  suggestions: Suggestion[];
  itinerary: ItineraryDay[];
  currentUser: Traveler | null;
  isAdmin: boolean;
  onRefresh: () => void;
}

const CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  restaurante: 'Restaurante',
  actividad: 'Actividad',
  hospedaje: 'Hospedaje',
  'transporte alterno': 'Transporte',
  'rumba/noche': 'Rumba',
  otro: 'Otro',
};

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  suggestions,
  itinerary,
  currentUser,
  isAdmin,
  onRefresh,
}) => {
  const { t } = useLang();
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'aprobadas'>('todas');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('actividad');
  const [description, setDescription] = useState('');
  const [dayNumber, setDayNumber] = useState<string>('1');
  const [estimatedCostCOP, setEstimatedCostCOP] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
    await updateSuggestionStatus(approvingSug.id, 'aprobada', adminNote.trim() || undefined, true, targetDay);
    setIsProcessing(false);
    setApprovingSug(null);
    onRefresh();
  };
  const handleDiscard = async (sugId: string) => {
    if (!window.confirm('¿Descartar esta propuesta?')) return;
    await updateSuggestionStatus(sugId, 'descartada');
    onRefresh();
  };

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
    <div>
      <SectionHeader
        title={t('ideas_title')}
        lead={t('ideas_lead')}
        actions={
          <Button onClick={() => setIsFormOpen((v) => !v)}>
            <Plus className="w-4 h-4" /> {t('ideas_propose')}
          </Button>
        }
      />

      {submitSuccess && (
        <div className="p-3.5 bg-ok/10 border border-ok/30 rounded-xl text-ok text-sm font-semibold mb-4">
          ¡Tu sugerencia fue enviada! Queda pendiente de revisión del admin.
        </div>
      )}

      {isFormOpen && (
        <Surface className="mb-6 grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink">Nueva propuesta</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-ink2 hover:text-ink cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Título">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Ceviche en La Cevichería"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Categoría">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
                  className={inputCls}
                >
                  {(Object.keys(CATEGORY_LABEL) as SuggestionCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Día sugerido">
                <select value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} className={inputCls}>
                  {itinerary.map((d) => (
                    <option key={d.dayNumber} value={d.dayNumber}>
                      Día {d.dayNumber}: {d.city}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Presupuesto estimado COP (opcional)">
                <input
                  type="number"
                  value={estimatedCostCOP}
                  onChange={(e) => setEstimatedCostCOP(e.target.value)}
                  placeholder="35000"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="¿Por qué lo recomiendas?">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ubicación, tips, enlaces..."
                className={inputCls}
                required
              />
            </Field>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <p className="text-xs text-ink2">
                A nombre de <b className="text-ink">{currentUser?.name}</b>
              </p>
              <Button type="submit" disabled={isSubmitting}>
                <Send className="w-4 h-4" /> {isSubmitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      <div className="flex gap-2 flex-wrap mb-5">
        <FilterPill active={filter === 'todas'} onClick={() => setFilter('todas')}>
          {t('ideas_all')} ({visibleSuggestions.length})
        </FilterPill>
        <FilterPill active={filter === 'pendientes'} onClick={() => setFilter('pendientes')}>
          {t('ideas_pending')} {pendingCount > 0 ? `(${pendingCount})` : ''}
        </FilterPill>
        <FilterPill active={filter === 'aprobadas'} onClick={() => setFilter('aprobadas')}>
          {t('ideas_approved')} ({visibleSuggestions.filter((s) => s.status === 'aprobada').length})
        </FilterPill>
      </div>

      {filteredSuggestions.length === 0 ? (
        <EmptyState>{t('ideas_empty')}</EmptyState>
      ) : (
        <Surface className="grid gap-3">
          {filteredSuggestions.map((sug) => {
            const isPending = sug.status === 'pendiente';
            const isApproved = sug.status === 'aprobada';
            const isDiscarded = sug.status === 'descartada';
            return (
              <div key={sug.id} className={`border-b border-line py-4 grid gap-1.5 ${isDiscarded ? 'opacity-50' : ''}`}>
                <div className="flex justify-between gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip>{CATEGORY_LABEL[sug.category] ?? sug.category}</Chip>
                    {sug.dayNumber && (
                      <span className="text-xs text-ink2">
                        Día {sug.dayNumber} {sug.city ? `· ${sug.city}` : ''}
                      </span>
                    )}
                  </div>
                  {isPending && (
                    <Chip tone="wait">
                      <Clock className="w-3 h-3" /> {t('ideas_status_pending')}
                    </Chip>
                  )}
                  {isApproved && (
                    <Chip tone="ok">
                      <CheckCircle className="w-3 h-3" /> {t('ideas_status_approved')}
                    </Chip>
                  )}
                  {isDiscarded && (
                    <Chip>
                      <XCircle className="w-3 h-3" /> {t('ideas_status_discarded')}
                    </Chip>
                  )}
                </div>
                <h4 className="font-bold text-ink">{sug.title}</h4>
                <p className="text-sm text-ink2">{sug.description}</p>
                {sug.adminNote && (
                  <p className="text-xs text-ink2 flex items-start gap-1.5 bg-soft rounded-lg px-2.5 py-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      <b className="text-ink">Nota del admin:</b> {sug.adminNote}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink2">
                  <span>
                    {sug.proposerName} · {formatDateEs(sug.createdAt)}
                  </span>
                  {!!sug.estimatedCostCOP && <span>· {formatCOP(sug.estimatedCostCOP)}</span>}
                </div>
                {isAdmin && isPending && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleOpenApproveModal(sug)}>
                      {t('ideas_approve')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDiscard(sug.id)}>
                      {t('ideas_discard')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Surface>
      )}

      {approvingSug && (
        <Modal title="Aprobar e integrar al itinerario" onClose={() => setApprovingSug(null)}>
          <p className="text-sm text-ink2">
            Estás aprobando <b className="text-ink">"{approvingSug.title}"</b> propuesta por{' '}
            <b className="text-ink">{approvingSug.proposerName}</b>.
          </p>
          <Field label="¿A qué día se integra?">
            <select value={targetDay} onChange={(e) => setTargetDay(Number(e.target.value))} className={inputCls}>
              {itinerary.map((d) => (
                <option key={d.dayNumber} value={d.dayNumber}>
                  Día {d.dayNumber}: {d.city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nota para el grupo (opcional)">
            <input
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ej. Ya llamamos para reservar..."
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setApprovingSug(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmApprove} disabled={isProcessing}>
              {isProcessing ? 'Aprobando...' : 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
