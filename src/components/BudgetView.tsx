import React, { useEffect, useState } from 'react';
import { BudgetConfig, Lodging, TayronaCategory, TransportLeg } from '../types';
import { updateBudgetConfig } from '../api';
import { Button, Field, Modal, SectionHeader, Surface, formatCOP, inputCls } from './ui';
import { useLang } from '../lib/i18n';

interface BudgetViewProps {
  lodging: Lodging[];
  transportLegs: TransportLeg[];
  itineraryDaysCount: number;
  budgetConfig: BudgetConfig;
  isAdmin: boolean;
  onRefresh: () => void;
}

interface Scenario {
  foodPerDayCOP: number;
  partySpendPerNightCOP: number;
  partyNights: number;
  localTransportCOP: number;
  activitiesExtrasCOP: number;
  festivalsCOP: number;
  tayronaCategory: TayronaCategory;
  highSeason: boolean;
}

const STORAGE_KEY = 'rc_budget_scenario';

const TAYRONA_PRICES: Record<TayronaCategory, { low: number; high: number }> = {
  nacional: { low: 27500, high: 43000 },
  extranjero: { low: 81000, high: 96500 },
};

function toScenario(cfg: BudgetConfig): Scenario {
  return {
    foodPerDayCOP: cfg.foodPerDayCOP,
    partySpendPerNightCOP: cfg.partySpendPerNightCOP,
    partyNights: cfg.partyNights,
    localTransportCOP: cfg.localTransportCOP,
    activitiesExtrasCOP: cfg.activitiesExtrasCOP,
    festivalsCOP: cfg.festivalsCOP,
    tayronaCategory: cfg.tayronaCategory,
    highSeason: cfg.highSeason,
  };
}

function loadLocalScenario(): Scenario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Scenario) : null;
  } catch {
    return null;
  }
}

function saveLocalScenario(s: Scenario) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* localStorage bloqueado: el escenario personal no se guarda entre visitas */
  }
}

function clearLocalScenario() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada que limpiar */
  }
}

function nightsOf(l: Lodging): number {
  return Math.max(0, Math.round((Date.parse(l.toDate) - Date.parse(l.fromDate)) / 86400000));
}

const CATEGORY_COLOR = {
  lodging: '#0d9488',
  transport: '#10b981',
  tayrona: '#f97316',
  food: '#d97706',
  party: '#db2777',
  localTransport: '#64748b',
  extras: '#334155',
  festivals: '#059669',
} as const;

export const BudgetView: React.FC<BudgetViewProps> = ({
  lodging,
  transportLegs,
  itineraryDaysCount,
  budgetConfig,
  isAdmin,
  onRefresh,
}) => {
  const { t, lang } = useLang();
  const [scenario, setScenario] = useState<Scenario>(() => loadLocalScenario() ?? toScenario(budgetConfig));
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<Scenario>(() => toScenario(budgetConfig));
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  useEffect(() => {
    if (!loadLocalScenario()) setScenario(toScenario(budgetConfig));
    setAdminForm(toScenario(budgetConfig));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetConfig]);

  const updateScenario = (patch: Partial<Scenario>) => {
    setScenario((prev) => {
      const next = { ...prev, ...patch };
      saveLocalScenario(next);
      return next;
    });
  };

  const handleResetToAdmin = () => {
    clearLocalScenario();
    setScenario(toScenario(budgetConfig));
  };

  const handleOpenAdminModal = () => {
    setAdminForm(toScenario(budgetConfig));
    setIsAdminModalOpen(true);
  };

  const handleSaveAdminBase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAdmin(true);
    const ok = await updateBudgetConfig(adminForm);
    setIsSavingAdmin(false);
    if (ok) {
      setIsAdminModalOpen(false);
      onRefresh();
    }
  };

  const lodgingTotal = lodging.reduce((sum, l) => sum + nightsOf(l) * l.pricePerNightCOP, 0);
  const transportTotal = transportLegs.reduce((sum, tl) => sum + tl.priceCOP, 0);
  const tayronaTotal = TAYRONA_PRICES[scenario.tayronaCategory][scenario.highSeason ? 'high' : 'low'];
  const foodTotal = scenario.foodPerDayCOP * Math.max(itineraryDaysCount, 1);
  const partyTotal = scenario.partySpendPerNightCOP * scenario.partyNights;

  const categories = [
    { key: 'lodging', label: t('budget_cat_lodging'), value: lodgingTotal, color: CATEGORY_COLOR.lodging },
    { key: 'transport', label: t('budget_cat_transport'), value: transportTotal, color: CATEGORY_COLOR.transport },
    { key: 'tayrona', label: t('budget_cat_tayrona'), value: tayronaTotal, color: CATEGORY_COLOR.tayrona },
    { key: 'food', label: t('budget_cat_food'), value: foodTotal, color: CATEGORY_COLOR.food },
    { key: 'party', label: t('budget_cat_party'), value: partyTotal, color: CATEGORY_COLOR.party },
    {
      key: 'localTransport',
      label: t('budget_cat_local_transport'),
      value: scenario.localTransportCOP,
      color: CATEGORY_COLOR.localTransport,
    },
    { key: 'extras', label: t('budget_cat_extras'), value: scenario.activitiesExtrasCOP, color: CATEGORY_COLOR.extras },
    { key: 'festivals', label: t('budget_cat_festivals'), value: scenario.festivalsCOP, color: CATEGORY_COLOR.festivals },
  ];

  const total = categories.reduce((sum, c) => sum + c.value, 0);
  const variableTotal = foodTotal + partyTotal + scenario.localTransportCOP + scenario.activitiesExtrasCOP + scenario.festivalsCOP;
  const fixedTotal = total - variableTotal;
  const rangeLow = Math.round(fixedTotal + variableTotal * 0.85);
  const rangeHigh = Math.round(fixedTotal + variableTotal * 1.15);

  const updatedAtLabel = budgetConfig.updatedAt
    ? new Date(budgetConfig.updatedAt).toLocaleString(lang === 'es' ? 'es-CO' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const scenarioFields: {
    key: keyof Scenario;
    label: string;
    min: number;
    max: number;
    step: number;
    isCurrency: boolean;
  }[] = [
    { key: 'foodPerDayCOP', label: t('budget_field_food_per_day'), min: 0, max: 200000, step: 5000, isCurrency: true },
    { key: 'partySpendPerNightCOP', label: t('budget_field_party_spend'), min: 0, max: 300000, step: 10000, isCurrency: true },
    { key: 'partyNights', label: t('budget_field_party_nights'), min: 0, max: 10, step: 1, isCurrency: false },
    { key: 'localTransportCOP', label: t('budget_field_local_transport'), min: 0, max: 500000, step: 10000, isCurrency: true },
    { key: 'activitiesExtrasCOP', label: t('budget_field_extras'), min: 0, max: 500000, step: 10000, isCurrency: true },
    { key: 'festivalsCOP', label: t('budget_field_festivals'), min: 0, max: 1000000, step: 10000, isCurrency: true },
  ];

  return (
    <div>
      <SectionHeader
        title={t('budget_title')}
        lead={t('budget_lead')}
        actions={
          isAdmin && (
            <Button variant="ghost" size="sm" onClick={handleOpenAdminModal}>
              + {t('budget_base_values')}
            </Button>
          )
        }
      />

      <Surface className="mb-6">
        <div className="flex justify-between items-baseline gap-3 flex-wrap">
          <span className="text-ink2 font-semibold">{t('budget_total_label')}</span>
          <b className="text-3xl tracking-[-0.03em] text-ink">{formatCOP(total)}</b>
        </div>
        <p className="text-ink2 text-sm mt-1.5">
          {t('budget_range', { low: formatCOP(rangeLow), high: formatCOP(rangeHigh) })}
        </p>

        <div className="flex h-3 rounded-full overflow-hidden mt-4 bg-soft" role="img" aria-label={t('budget_total_label')}>
          {categories
            .filter((c) => c.value > 0)
            .map((c) => (
              <div
                key={c.key}
                style={{ width: `${total > 0 ? (c.value / total) * 100 : 0}%`, backgroundColor: c.color }}
                title={`${c.label}: ${formatCOP(c.value)}`}
              />
            ))}
        </div>

        <ul className="grid gap-2.5 mt-5 list-none p-0 m-0">
          {categories.map((c) => (
            <li key={c.key} className="flex justify-between items-center gap-3 text-[15px]">
              <span className="flex items-center gap-2 text-ink">
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                {c.label}
              </span>
              <b className="text-ink">{formatCOP(c.value)}</b>
            </li>
          ))}
        </ul>
      </Surface>

      <h3 className="text-xl font-bold text-ink mb-3">{t('budget_scenario_title')}</h3>
      <Surface>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenarioFields.map((f) => (
            <label key={f.key} className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">
                {f.label}: {f.isCurrency ? formatCOP(scenario[f.key] as number) : (scenario[f.key] as number)}
              </span>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={scenario[f.key] as number}
                onChange={(e) => updateScenario({ [f.key]: Number(e.target.value) } as Partial<Scenario>)}
                className="w-full accent-ink"
              />
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <Field label={t('budget_field_tayrona')}>
            <select
              value={scenario.tayronaCategory}
              onChange={(e) => updateScenario({ tayronaCategory: e.target.value as TayronaCategory })}
              className={inputCls}
            >
              <option value="nacional">{t('budget_tayrona_nacional')}</option>
              <option value="extranjero">{t('budget_tayrona_extranjero')}</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink self-end pb-2.5">
            <input
              type="checkbox"
              checked={scenario.highSeason}
              onChange={(e) => updateScenario({ highSeason: e.target.checked })}
              className="w-5 h-5"
            />
            {t('budget_high_season')}
          </label>
        </div>

        <div className="mt-5">
          <Button variant="ghost" size="sm" onClick={handleResetToAdmin}>
            {t('budget_reset_to_admin')}
          </Button>
        </div>

        <p className="text-ink2 text-xs mt-5">{t('budget_tayrona_note')}</p>
        {updatedAtLabel && <p className="text-ink2 text-xs mt-2">{t('budget_last_update', { date: updatedAtLabel })}</p>}
      </Surface>

      {isAdminModalOpen && (
        <Modal title={t('budget_base_values')} onClose={() => setIsAdminModalOpen(false)}>
          <form onSubmit={handleSaveAdminBase} className="grid gap-3">
            {scenarioFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  inputMode="numeric"
                  value={adminForm[f.key] as number}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, [f.key]: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                  className={inputCls}
                />
              </Field>
            ))}
            <Field label={t('budget_field_tayrona')}>
              <select
                value={adminForm.tayronaCategory}
                onChange={(e) => setAdminForm({ ...adminForm, tayronaCategory: e.target.value as TayronaCategory })}
                className={inputCls}
              >
                <option value="nacional">{t('budget_tayrona_nacional')}</option>
                <option value="extranjero">{t('budget_tayrona_extranjero')}</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={adminForm.highSeason}
                onChange={(e) => setAdminForm({ ...adminForm, highSeason: e.target.checked })}
                className="w-5 h-5"
              />
              {t('budget_high_season')}
            </label>
            <div className="flex gap-2.5 justify-end pt-2 border-t border-line">
              <Button type="button" variant="ghost" onClick={() => setIsAdminModalOpen(false)}>
                {t('generic_cancel')}
              </Button>
              <Button type="submit" disabled={isSavingAdmin}>
                {isSavingAdmin ? t('generic_saving') : t('generic_save')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
