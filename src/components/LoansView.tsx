import React, { useState } from 'react';
import { Plus, X, Search, Calendar } from 'lucide-react';
import { Loan, Traveler } from '../types';
import {
  formatCOP,
  formatDateEs,
  calculatePairwiseNet,
  calculateIndividualBalances,
  calculateOptimizedSettlements,
} from '../utils/debts';
import { createLoan, deleteLoan, toggleSettleLoan } from '../api';
import { Button, Chip, EmptyState, Field, SectionHeader, Surface, inputCls } from './ui';
import { useLang } from '../lib/i18n';

interface LoansViewProps {
  loans: Loan[];
  travelers: Traveler[];
  currentUser: Traveler | null;
  isAdmin: boolean;
  onRefresh: () => void;
}

const QUICK_CONCEPTS = ['Taxi / Van', 'Cena grupal', 'Almuerzo', 'Cervezas', 'Entrada Tayrona', 'Lancha'];

export const LoansView: React.FC<LoansViewProps> = ({ loans, travelers, currentUser, isAdmin, onRefresh }) => {
  const { t } = useLang();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [settlementMode, setSettlementMode] = useState<'pairwise' | 'optimized'>('pairwise');

  const [lender, setLender] = useState(currentUser?.name || '');
  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (currentUser && !lender) setLender(currentUser.name);
  }, [currentUser]);

  const pairwiseSettlements = calculatePairwiseNet(loans);
  const optimizedSettlements = calculateOptimizedSettlements(loans);
  const individualBalances = calculateIndividualBalances(loans);
  const displayedSettlements = settlementMode === 'pairwise' ? pairwiseSettlements : optimizedSettlements;
  const myBalance = currentUser ? individualBalances[currentUser.name] || 0 : 0;

  const filteredLoans = loans.filter((loan) => {
    if (mineOnly && currentUser && loan.lender !== currentUser.name && loan.borrower !== currentUser.name)
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        loan.concept.toLowerCase().includes(q) ||
        loan.lender.toLowerCase().includes(q) ||
        loan.borrower.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalActiveDebt = loans.filter((l) => !l.settled).reduce((acc, l) => acc + l.amount, 0);
  const travelerNames = travelers.map((t) => t.name);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsedAmount = Number(amount);
    if (!lender) return setErrorMsg('Selecciona quién puso la plata.');
    if (!borrower) return setErrorMsg('Selecciona para quién fue.');
    if (lender === borrower) return setErrorMsg('No puedes registrar un préstamo a ti mismo.');
    if (!parsedAmount || parsedAmount <= 0) return setErrorMsg('Ingresa un monto válido mayor a $0.');
    if (!concept.trim()) return setErrorMsg('Ingresa el motivo (ej. taxi, cena).');

    setIsSubmitting(true);
    const success = await createLoan({ lender: lender.trim(), borrower: borrower.trim(), amount: parsedAmount, concept: concept.trim() });
    setIsSubmitting(false);
    if (success) {
      setAmount('');
      setConcept('');
      setIsFormOpen(false);
      setSuccessMsg('¡Movimiento registrado! Los saldos ya se compensaron.');
      setTimeout(() => setSuccessMsg(''), 4000);
      onRefresh();
    } else {
      setErrorMsg('Error al guardar el registro.');
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    if (await deleteLoan(id)) onRefresh();
  };
  const handleToggleSettle = async (id: string) => {
    await toggleSettleLoan(id);
    onRefresh();
  };
  const addAmountQuick = (extra: number) => setAmount(String((Number(amount) || 0) + extra));

  return (
    <div>
      <SectionHeader
        title={t('loans_title')}
        lead={t('loans_lead')}
        actions={
          <Button onClick={() => setIsFormOpen((v) => !v)}>
            <Plus className="w-4 h-4" /> {t('loans_register')}
          </Button>
        }
      />

      {successMsg && (
        <div className="p-3.5 bg-ok/10 border border-ok/30 rounded-xl text-ok text-sm font-semibold mb-4">
          {successMsg}
        </div>
      )}

      {currentUser && (
        <Surface className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentUser.avatar}</span>
            <div>
              <p className="text-xs text-ink2">{t('loans_your_balance')} ({currentUser.name})</p>
              <p
                className={`text-xl font-bold ${
                  myBalance > 0 ? 'text-ok' : myBalance < 0 ? 'text-bad' : 'text-ink'
                }`}
              >
                {myBalance > 0
                  ? `${t('loans_owed')} ${formatCOP(myBalance)}`
                  : myBalance < 0
                    ? `${t('loans_owe')} ${formatCOP(Math.abs(myBalance))}`
                    : t('loans_settled')}
              </p>
            </div>
          </div>
          <div className="text-xs text-ink2">
            {t('loans_group_total')}: <b className="text-ink">{formatCOP(totalActiveDebt)}</b>
          </div>
        </Surface>
      )}

      {isFormOpen && (
        <Surface className="mb-6 grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink">Registrar un movimiento</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-ink2 hover:text-ink cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreateLoan} className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="¿Quién puso la plata?">
                <select value={lender} onChange={(e) => setLender(e.target.value)} className={inputCls} required>
                  <option value="">Selecciona</option>
                  {travelerNames.map((name) => (
                    <option key={name} value={name}>
                      {name} {name === currentUser?.name ? '(Tú)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="¿Para quién fue?">
                <select value={borrower} onChange={(e) => setBorrower(e.target.value)} className={inputCls} required>
                  <option value="">Selecciona</option>
                  {travelerNames
                    .filter((n) => n !== lender)
                    .map((name) => (
                      <option key={name} value={name}>
                        {name} {name === currentUser?.name ? '(Tú)' : ''}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Monto (COP)">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  step="1000"
                  className={inputCls}
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[10000, 20000, 50000, 100000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => addAmountQuick(inc)}
                      className="px-2 py-0.5 bg-soft hover:bg-line text-ink text-[11px] font-semibold rounded-lg cursor-pointer"
                    >
                      +{formatCOP(inc)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="¿De qué fue?">
                <input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Taxi, cena, entrada Tayrona..."
                  className={inputCls}
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {QUICK_CONCEPTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConcept(c)}
                      className="px-2 py-0.5 bg-soft hover:bg-line text-ink text-[11px] font-medium rounded-lg cursor-pointer"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <p className="text-xs text-ink2 italic">La fecha y hora se registran automáticamente.</p>
            {errorMsg && <p className="text-bad text-sm font-medium">{errorMsg}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar movimiento'}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      <Surface className="mb-5">
        <div className="flex justify-between items-center gap-3 flex-wrap mb-3">
          <h3 className="font-bold text-ink">{t('loans_settle_up')}</h3>
          <div className="flex bg-soft p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSettlementMode('pairwise')}
              className={`px-3 py-1 rounded-md cursor-pointer ${settlementMode === 'pairwise' ? 'bg-surface text-ink shadow-sm' : 'text-ink2'}`}
            >
              {t('loans_direct')}
            </button>
            <button
              onClick={() => setSettlementMode('optimized')}
              className={`px-3 py-1 rounded-md cursor-pointer ${settlementMode === 'optimized' ? 'bg-surface text-ink shadow-sm' : 'text-ink2'}`}
            >
              {t('loans_minimal')}
            </button>
          </div>
        </div>
        {displayedSettlements.length === 0 ? (
          <p className="text-sm text-ink2 text-center py-4">{t('loans_no_debts')}</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {displayedSettlements.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-soft rounded-xl px-3.5 py-2.5">
                <span className="text-sm text-ink">
                  <b>{s.from}</b> <span className="text-ink2 text-xs">{t('loans_pays_to')}</span> <b>{s.to}</b>
                </span>
                <span className="font-bold text-ink bg-surface border border-line px-2.5 py-0.5 rounded-lg text-sm">
                  {formatCOP(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface>
        <div className="flex justify-between items-center gap-3 flex-wrap mb-3">
          <h3 className="font-bold text-ink">{t('loans_history')} ({loans.length})</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink2 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('loans_search')}
                className="pl-8 pr-3 py-1.5 bg-soft border border-line rounded-lg text-xs text-ink w-40"
              />
            </div>
            {currentUser && (
              <button
                onClick={() => setMineOnly(!mineOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  mineOnly ? 'bg-ink text-bg' : 'bg-soft text-ink2'
                }`}
              >
                {t('loans_mine_only')}
              </button>
            )}
          </div>
        </div>
        {filteredLoans.length === 0 ? (
          <EmptyState>{t('loans_history_empty')}</EmptyState>
        ) : (
          <div className="grid gap-2">
            {filteredLoans.map((loan) => (
              <div
                key={loan.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line py-3 ${loan.settled ? 'opacity-50' : ''}`}
              >
                <div>
                  <p className="text-sm text-ink">
                    <b>{loan.lender}</b> <span className="text-ink2 text-xs">le prestó a</span>{' '}
                    <b>{loan.borrower}</b> · "{loan.concept}"
                    {loan.settled && <Chip tone="ok"> Saldado</Chip>}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-ink2 mt-0.5">
                    <Calendar className="w-3 h-3" /> {formatDateEs(loan.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-ink">{formatCOP(loan.amount)}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleSettle(loan.id)}>
                    {loan.settled ? t('loans_reactivate') : t('loans_settle')}
                  </Button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteLoan(loan.id)}
                      className="text-ink2 hover:text-bad p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
};
