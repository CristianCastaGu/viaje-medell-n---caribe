import React, { useState } from 'react';
import {
  MapPin, Building, Bus, DollarSign, Clock, Plus, Edit2, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, Navigation, X, Lightbulb, Send,
} from 'lucide-react';
import { ItineraryDay, ActivityItem, ActivityCategory, Traveler, SuggestionCategory, CityName, Place } from '../types';
import { formatCOP } from '../utils/debts';
import { updateItineraryDay, createSuggestion } from '../api';
import { CITY_LABEL, CITY_ORDER, CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';
import { Button, Chip, CityDot, Field, Modal, SectionHeader, Surface, TotalRow, inputCls } from './ui';
import { RouteMap } from './RouteMap';
import { useLang } from '../lib/i18n';

interface ItineraryViewProps {
  itinerary: ItineraryDay[];
  places: Place[];
  isAdmin: boolean;
  currentUser?: Traveler | null;
  onItineraryUpdated: () => void;
  onNavigateToSuggestions?: (dayNumber?: number) => void;
}

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  visita: 'Visita',
  comida: 'Comida',
  playa: 'Playa',
  transporte: 'Transporte',
  hospedaje: 'Hospedaje',
  rumba: 'Rumba',
  naturaleza: 'Naturaleza',
};

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  itinerary,
  places,
  isAdmin,
  currentUser,
  onItineraryUpdated,
  onNavigateToSuggestions,
}) => {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editingDayData, setEditingDayData] = useState<ItineraryDay | null>(null);

  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActTime, setNewActTime] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActCategory, setNewActCategory] = useState<ActivityCategory>('visita');
  const [newActCost, setNewActCost] = useState('');
  const [newActLocation, setNewActLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalCategory, setProposalCategory] = useState<SuggestionCategory>('actividad');
  const [proposalDesc, setProposalDesc] = useState('');
  const [proposalCost, setProposalCost] = useState('');
  const [proposalSuccessMsg, setProposalSuccessMsg] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const { t } = useLang();
  const currentDay = itinerary.find((d) => d.dayNumber === selectedDayNumber) || itinerary[0];
  const totalTripBudget = itinerary.reduce((acc, d) => acc + (d.estimatedBudgetCOP || 0), 0);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim()) return;
    setIsSubmittingProposal(true);
    const success = await createSuggestion({
      dayNumber: currentDay.dayNumber,
      city: currentDay.city,
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
      }, 1400);
    }
  };

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
    setIsSaving(true);
    const success = await updateItineraryDay({ ...currentDay, activities: [...currentDay.activities, newActivity] });
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
    if (!window.confirm('¿Eliminar esta actividad del itinerario?')) return;
    await updateItineraryDay({ ...currentDay, activities: currentDay.activities.filter((a) => a.id !== actId) });
    onItineraryUpdated();
  };

  if (!currentDay) return null;
  const dayStyle = CITY_STYLE[cityCodeFromName(currentDay.city)];

  return (
    <div>
      <SectionHeader title={t('route_title')} lead={t('route_lead')} />

      <TotalRow label={t('route_total_budget')} value={formatCOP(totalTripBudget)} />

      {/* Franja de días (equivalente al calendario del prototipo, en 10 días fijos) */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 my-6">
        {itinerary.map((day) => {
          const isSelected = day.dayNumber === selectedDayNumber;
          const style = CITY_STYLE[cityCodeFromName(day.city)];
          return (
            <button
              key={day.dayNumber}
              id={`calendar-day-btn-${day.dayNumber}`}
              onClick={() => setSelectedDayNumber(day.dayNumber)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border-[1.5px] min-h-[64px] transition-all cursor-pointer ${style.soft} ${
                isSelected ? `${style.border} border-2` : 'border-transparent hover:border-line'
              }`}
            >
              <b className="text-lg leading-none tracking-[-0.02em] text-ink">{day.dayNumber + 8}</b>
              <span className="text-[10px] text-ink2 truncate max-w-full">{day.city}</span>
            </button>
          );
        })}
      </div>

      <Surface>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-line">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-ink text-bg">
                DÍA {currentDay.dayNumber}
              </span>
              <span className="text-xs font-medium text-ink2">{currentDay.date}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                <CityDot city={currentDay.city} /> {currentDay.city}
              </span>
            </div>
            <h3 className="text-[26px] sm:text-3xl font-bold tracking-[-0.03em] text-ink">{currentDay.title}</h3>
            <p className="text-sm text-ink2 mt-1 italic">"{currentDay.tagline}"</p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => setSelectedDayNumber(Math.max(1, currentDay.dayNumber - 1))}
              disabled={currentDay.dayNumber <= 1}
              className="p-2 rounded-xl border border-line text-ink2 hover:text-ink hover:border-ink disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDayNumber(Math.min(10, currentDay.dayNumber + 1))}
              disabled={currentDay.dayNumber >= 10}
              className="p-2 rounded-xl border border-line text-ink2 hover:text-ink hover:border-ink disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={handleStartEditDay}>
                <Edit2 className="w-3.5 h-3.5" /> {t('route_edit_day')}
              </Button>
            )}
          </div>
        </div>

        <div className="pt-5">
          <RouteMap
            itinerary={itinerary}
            places={places}
            currentDay={currentDay}
            isAdmin={isAdmin}
            onRefresh={onItineraryUpdated}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-3 py-5">
          <div className="bg-soft rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-ink2 font-semibold text-xs uppercase tracking-wide mb-1.5">
              <Building className="w-3.5 h-3.5" /> {t('route_lodging')}
            </div>
            <p className="text-sm font-bold text-ink">{currentDay.lodging || t('route_lodging_fallback')}</p>
            {currentDay.lodgingNotes && <p className="text-xs text-ink2 mt-1">{currentDay.lodgingNotes}</p>}
          </div>
          <div className="bg-soft rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-ink2 font-semibold text-xs uppercase tracking-wide mb-1.5">
              <Bus className="w-3.5 h-3.5" /> {t('route_transport')}
            </div>
            <p className="text-sm font-bold text-ink">{currentDay.transport || t('route_transport_fallback')}</p>
          </div>
          <div className="bg-soft rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-ink2 font-semibold text-xs uppercase tracking-wide mb-1.5">
              <DollarSign className="w-3.5 h-3.5" /> {t('route_day_budget')}
            </div>
            <p className="text-lg font-bold text-ink">{formatCOP(currentDay.estimatedBudgetCOP)}</p>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-ink flex items-center gap-2">
              <Navigation className="w-4 h-4 text-ink2" />
              {t('route_plan')} ({currentDay.activities.length})
            </h4>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsProposalModalOpen(true)}>
                <Lightbulb className="w-3.5 h-3.5" /> {t('route_propose')}
              </Button>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => setIsAddingActivity((v) => !v)}>
                  <Plus className="w-3.5 h-3.5" /> {t('route_add_activity')}
                </Button>
              )}
            </div>
          </div>

          {isAddingActivity && isAdmin && (
            <form onSubmit={handleAddActivity} className="p-4 bg-soft rounded-xl grid gap-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink2 uppercase">Nueva actividad — Día {currentDay.dayNumber}</span>
                <button type="button" onClick={() => setIsAddingActivity(false)} className="text-ink2 hover:text-ink cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={newActTitle} onChange={(e) => setNewActTitle(e.target.value)} placeholder="Título de la actividad" className={inputCls} required />
                <input value={newActTime} onChange={(e) => setNewActTime(e.target.value)} placeholder="Horario (ej. 2:00 PM)" className={inputCls} />
                <select value={newActCategory} onChange={(e) => setNewActCategory(e.target.value as ActivityCategory)} className={inputCls}>
                  {(Object.keys(CATEGORY_LABEL) as ActivityCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
                <input type="number" value={newActCost} onChange={(e) => setNewActCost(e.target.value)} placeholder="Costo estimado COP" className={inputCls} />
                <input value={newActLocation} onChange={(e) => setNewActLocation(e.target.value)} placeholder="Lugar" className={`sm:col-span-2 ${inputCls}`} />
                <textarea value={newActDesc} onChange={(e) => setNewActDesc(e.target.value)} rows={2} placeholder="Descripción..." className={`sm:col-span-2 ${inputCls}`} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingActivity(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          )}

          {currentDay.activities.length === 0 ? (
            <p className="text-center py-6 text-ink2 text-sm italic">{t('route_no_activities')}</p>
          ) : (
            <ul className="grid gap-2.5 list-none p-0 m-0">
              {currentDay.activities.map((act, index) => (
                <li key={act.id || index} className="flex flex-col sm:flex-row items-start justify-between gap-3 bg-soft rounded-xl p-3.5">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {act.time && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink2">
                          <Clock className="w-3 h-3" /> {act.time}
                        </span>
                      )}
                      <Chip>{CATEGORY_LABEL[act.category]}</Chip>
                      {act.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-ink2">
                          <MapPin className="w-3 h-3" /> {act.location}
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-ink text-sm">{act.title}</h5>
                    {act.description && <p className="text-xs text-ink2 mt-0.5">{act.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!!act.costEstimateCOP && (
                      <span className="text-xs font-bold text-ink bg-surface border border-line px-2 py-0.5 rounded-lg">
                        {formatCOP(act.costEstimateCOP)}
                      </span>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDeleteActivity(act.id)} className="text-ink2 hover:text-bad p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Surface>

      {isEditingDay && editingDayData && (
        <Modal title={`Editar Día ${editingDayData.dayNumber}: ${editingDayData.city}`} onClose={() => setIsEditingDay(false)}>
          <form onSubmit={handleSaveDayEdit} className="grid gap-3">
            <Field label="Título del día">
              <input value={editingDayData.title} onChange={(e) => setEditingDayData({ ...editingDayData, title: e.target.value })} className={inputCls} required />
            </Field>
            <Field label="Frase / tagline">
              <input value={editingDayData.tagline} onChange={(e) => setEditingDayData({ ...editingDayData, tagline: e.target.value })} className={inputCls} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Ciudad">
                <select
                  value={editingDayData.city}
                  onChange={(e) => setEditingDayData({ ...editingDayData, city: e.target.value as CityName })}
                  className={inputCls}
                >
                  {CITY_ORDER.map((c) => (
                    <option key={c} value={CITY_LABEL[c]}>{CITY_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Presupuesto estimado (COP)">
                <input type="number" value={editingDayData.estimatedBudgetCOP} onChange={(e) => setEditingDayData({ ...editingDayData, estimatedBudgetCOP: Number(e.target.value) })} className={inputCls} required />
              </Field>
            </div>
            <Field label="Hospedaje">
              <input value={editingDayData.lodging} onChange={(e) => setEditingDayData({ ...editingDayData, lodging: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Notas de hospedaje">
              <textarea value={editingDayData.lodgingNotes || ''} onChange={(e) => setEditingDayData({ ...editingDayData, lodgingNotes: e.target.value })} rows={2} className={inputCls} />
            </Field>
            <Field label="Transporte">
              <input value={editingDayData.transport} onChange={(e) => setEditingDayData({ ...editingDayData, transport: e.target.value })} className={inputCls} />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button type="button" variant="ghost" onClick={() => setIsEditingDay(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isProposalModalOpen && (
        <Modal
          title={t('propose_title')}
          onClose={() => setIsProposalModalOpen(false)}
        >
          <p className="text-xs text-ink2 -mt-2">
            Día {currentDay.dayNumber} · {currentDay.city}
          </p>
          {proposalSuccessMsg ? (
            <div className="p-6 text-center grid gap-2 bg-ok/10 rounded-xl border border-ok/30">
              <CheckCircle2 className="w-8 h-8 text-ok mx-auto" />
              <p className="text-sm font-bold text-ink">{t('propose_sent')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitProposal} className="grid gap-3">
              <Field label={t('propose_field_title')}>
                <input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Ej. Parada en un mirador" className={inputCls} required />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t('propose_field_category')}>
                  <select value={proposalCategory} onChange={(e) => setProposalCategory(e.target.value as SuggestionCategory)} className={inputCls}>
                    <option value="actividad">{t('propose_cat_activity')}</option>
                    <option value="restaurante">{t('propose_cat_restaurant')}</option>
                    <option value="transporte alterno">{t('propose_cat_transport')}</option>
                    <option value="rumba/noche">{t('propose_cat_party')}</option>
                    <option value="hospedaje">{t('propose_cat_lodging')}</option>
                    <option value="otro">{t('propose_cat_other')}</option>
                  </select>
                </Field>
                <Field label={t('propose_field_cost')}>
                  <input type="number" value={proposalCost} onChange={(e) => setProposalCost(e.target.value)} placeholder="45000" className={inputCls} />
                </Field>
              </div>
              <Field label={t('propose_field_details')}>
                <textarea value={proposalDesc} onChange={(e) => setProposalDesc(e.target.value)} rows={3} placeholder="Qué haríamos y por qué vale la pena..." className={inputCls} required />
              </Field>
              <div className="flex items-center justify-between pt-2 border-t border-line">
                {onNavigateToSuggestions && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProposalModalOpen(false);
                      onNavigateToSuggestions(currentDay.dayNumber);
                    }}
                    className="text-xs font-semibold text-pal hover:underline cursor-pointer"
                  >
                    {t('propose_see_all')}
                  </button>
                )}
                <Button type="submit" disabled={isSubmittingProposal}>
                  <Send className="w-3.5 h-3.5" /> {isSubmittingProposal ? t('propose_sending') : t('propose_send')}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};
