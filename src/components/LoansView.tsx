import React, { useState } from 'react';
import { 
  Coins, Plus, ArrowRight, ArrowLeftRight, CheckCircle2, Trash2, 
  Search, Filter, Sparkles, User, Calendar, DollarSign, HelpCircle, Check
} from 'lucide-react';
import { Loan, Traveler } from '../types';
import { 
  formatCOP, formatDateEs, calculatePairwiseNet, calculateIndividualBalances, calculateOptimizedSettlements 
} from '../utils/debts';
import { createLoan, deleteLoan, toggleSettleLoan } from '../api';

interface LoansViewProps {
  loans: Loan[];
  travelers: Traveler[];
  currentUser: Traveler | null;
  isAdmin: boolean;
  onRefresh: () => void;
}

const COMMON_CONCEPTS = [
  'Taxi / Van',
  'Cena grupal',
  'Almuerzo típico',
  'Cervezas / Tragos',
  'Entrada Tayrona',
  'Lancha Islas',
  'Snacks y agua',
  'Supermercado',
];

export const LoansView: React.FC<LoansViewProps> = ({
  loans,
  travelers,
  currentUser,
  isAdmin,
  onRefresh,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMyLoansOnly, setFilterMyLoansOnly] = useState(false);
  const [settlementMode, setSettlementMode] = useState<'pairwise' | 'optimized'>('pairwise');

  // Form state
  const [lender, setLender] = useState(currentUser?.name || '');
  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Keep lender updated if currentUser changes
  React.useEffect(() => {
    if (currentUser && !lender) {
      setLender(currentUser.name);
    }
  }, [currentUser]);

  // Calculate Net balances
  const pairwiseSettlements = calculatePairwiseNet(loans);
  const optimizedSettlements = calculateOptimizedSettlements(loans);
  const individualBalances = calculateIndividualBalances(loans);

  const displayedSettlements = settlementMode === 'pairwise' ? pairwiseSettlements : optimizedSettlements;

  // Current user's individual net balance
  const myBalance = currentUser ? individualBalances[currentUser.name] || 0 : 0;

  // Filtered loans history
  const filteredLoans = loans.filter((loan) => {
    if (filterMyLoansOnly && currentUser) {
      const isMine = loan.lender === currentUser.name || loan.borrower === currentUser.name;
      if (!isMine) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchConcept = loan.concept.toLowerCase().includes(q);
      const matchLender = loan.lender.toLowerCase().includes(q);
      const matchBorrower = loan.borrower.toLowerCase().includes(q);
      return matchConcept || matchLender || matchBorrower;
    }
    return true;
  });

  const totalActiveDebt = loans
    .filter((l) => !l.settled)
    .reduce((acc, l) => acc + l.amount, 0);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = Number(amount);
    if (!lender) {
      setErrorMsg('Selecciona quién prestó el dinero.');
      return;
    }
    if (!borrower) {
      setErrorMsg('Selecciona a quién se le prestó el dinero.');
      return;
    }
    if (lender === borrower) {
      setErrorMsg('No puedes registrar un préstamo a ti mismo.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a $0.');
      return;
    }
    if (!concept.trim()) {
      setErrorMsg('Ingresa el motivo o concepto (ej. taxi, cena, cervezas).');
      return;
    }

    setIsSubmitting(true);
    const success = await createLoan({
      lender: lender.trim(),
      borrower: borrower.trim(),
      amount: parsedAmount,
      concept: concept.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      setAmount('');
      setConcept('');
      setIsFormOpen(false);
      setSuccessMsg('¡Préstamo registrado exitosamente! Se compensaron los saldos.');
      setTimeout(() => setSuccessMsg(''), 4000);
      onRefresh();
    } else {
      setErrorMsg('Error al guardar el préstamo.');
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de préstamo?')) return;
    await deleteLoan(id);
    onRefresh();
  };

  const handleToggleSettle = async (id: string) => {
    await toggleSettleLoan(id);
    onRefresh();
  };

  const addAmountQuick = (extra: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + extra));
  };

  // Traveler names options
  const travelerNames = travelers.map((t) => t.name);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white mb-2">
            <Coins className="w-3.5 h-3.5" />
            Cuentas Claras en el Viaje
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Préstamos y Compensación de Gastos
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 max-w-xl">
            Registra quién le pagó a quién (taxis, comidas, entradas). El sistema compensa automáticamente los saldos cruzados tipo Splitwise.
          </p>
        </div>

        <button
          id="btn-open-loan-form"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-5 py-3 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          Registrar Préstamo
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* User's Personal Balance Card */}
      {currentUser && (
        <div className="bg-white rounded-3xl border border-emerald-100 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-2xl flex items-center justify-center shrink-0">
              {currentUser.avatar}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Tu resumen personal ({currentUser.name})
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {myBalance > 0 ? (
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-600">
                    Te deben en total {formatCOP(myBalance)}
                  </span>
                ) : myBalance < 0 ? (
                  <span className="text-lg sm:text-xl font-extrabold text-red-600">
                    Debes en total {formatCOP(Math.abs(myBalance))}
                  </span>
                ) : (
                  <span className="text-lg sm:text-xl font-extrabold text-slate-700">
                    ¡Estás a mano! (Saldo $0)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 self-start sm:self-auto">
            Total préstamos registrados en el grupo:{' '}
            <strong className="text-slate-800">{formatCOP(totalActiveDebt)}</strong>
          </div>
        </div>
      )}

      {/* New Loan Form Modal / Drawer */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-md p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Registrar Nuevo Préstamo
              </h3>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={handleCreateLoan} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. ¿Quién prestó el dinero? *
                </label>
                <select
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Selecciona quién pagó</option>
                  {travelerNames.map((name) => (
                    <option key={name} value={name}>
                      {name} {name === currentUser?.name ? '(Tú)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Borrower */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. ¿A quién le prestó? *
                </label>
                <select
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Selecciona a quién le prestó</option>
                  {travelerNames
                    .filter((name) => name !== lender)
                    .map((name) => (
                      <option key={name} value={name}>
                        {name} {name === currentUser?.name ? '(Tú)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. Monto en Pesos Colombianos (COP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej. 45000"
                    step="1000"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                {/* Quick amount increment pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 mr-1">Rápido:</span>
                  {[10000, 20000, 50000, 100000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => addAmountQuick(inc)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                    >
                      +{formatCOP(inc).replace(',00', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concept */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  4. Motivo o concepto *
                </label>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Taxi aeropuerto, cena en Getsemaní, entrada Tayrona..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                {/* Quick concept pills */}
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {COMMON_CONCEPTS.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConcept(c)}
                      className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-lg text-[10px] font-medium hover:bg-emerald-100"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * La fecha y hora exactas se registrarán automáticamente por el sistema.
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                {isSubmitting ? 'Guardando...' : 'Guardar Préstamo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Section: Quién le debe a quién (Net Settlements) */}
      <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-orange-500" />
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Resumen de Saldos Netos ("Quién le debe a quién")
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Si A le prestó a B y luego B le prestó a A, las deudas se compensan automáticamente y solo queda el saldo neto.
            </p>
          </div>

          {/* Toggle between pairwise and minimum cashflow */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setSettlementMode('pairwise')}
              className={`px-3 py-1 rounded-lg transition-all ${
                settlementMode === 'pairwise'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Compensación Directa
            </button>
            <button
              onClick={() => setSettlementMode('optimized')}
              className={`px-3 py-1 rounded-lg transition-all ${
                settlementMode === 'optimized'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mínimas Transferencias
            </button>
          </div>
        </div>

        {/* Settlement Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayedSettlements.length === 0 ? (
            <div className="col-span-2 text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-700">¡Nadie le debe a nadie!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Todos los saldos están saldados o no hay préstamos activos.
              </p>
            </div>
          ) : (
            displayedSettlements.map((settlement, index) => {
              const isDebtorMe = currentUser && settlement.from === currentUser.name;
              const isCreditorMe = currentUser && settlement.to === currentUser.name;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isDebtorMe
                      ? 'bg-red-50/50 border-red-200'
                      : isCreditorMe
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <span className={isDebtorMe ? 'text-red-700' : 'text-slate-800'}>
                        {settlement.from} {isDebtorMe ? '(Tú)' : ''}
                      </span>
                      <span className="text-xs font-normal text-slate-500">le debe a</span>
                      <span className={isCreditorMe ? 'text-emerald-700' : 'text-slate-800'}>
                        {settlement.to} {isCreditorMe ? '(Tú)' : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Saldo compensado en tiempo real
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-black text-emerald-900 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
                      {formatCOP(settlement.amount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Full Transactions History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Historial de Registros ({loans.length})
            </h3>
            <p className="text-xs text-slate-500">
              Detalle de cada préstamo individual registrado por el grupo con su fecha y hora automática.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por concepto o nombre..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>

            {currentUser && (
              <button
                onClick={() => setFilterMyLoansOnly(!filterMyLoansOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  filterMyLoansOnly
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Solo mis cuentas
              </button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-2.5">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              No hay préstamos que coincidan con la búsqueda.
            </div>
          ) : (
            filteredLoans.map((loan) => {
              const isSettled = loan.settled;

              return (
                <div
                  key={loan.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSettled
                      ? 'bg-slate-50/50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                      <span className="font-extrabold text-emerald-800">
                        {loan.lender}
                      </span>
                      <span className="text-slate-400 text-xs">le prestó a</span>
                      <span className="font-extrabold text-red-800">
                        {loan.borrower}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-700">
                        "{loan.concept}"
                      </span>
                      {isSettled && (
                        <span className="ml-1 text-[10px] font-bold px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full">
                          Saldado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDateEs(loan.createdAt)}</span>
                      <span>(Auto-generado)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-base font-black text-slate-900">
                      {formatCOP(loan.amount)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        id={`btn-settle-loan-${loan.id}`}
                        onClick={() => handleToggleSettle(loan.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSettled
                            ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={isSettled ? 'Reactivar deuda' : 'Marcar como pagado'}
                      >
                        {isSettled ? 'Reactivar' : 'Saldar'}
                      </button>

                      {isAdmin && (
                        <button
                          id={`btn-delete-loan-${loan.id}`}
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar préstamo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
