import { Loan, Settlement } from '../types';

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateEs(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Direct pairwise netting:
 * For every unordered pair {A, B}, calculate net debt.
 * If A lent B $50.000 and B lent A $20.000, then B owes A $30.000.
 */
export function calculatePairwiseNet(loans: Loan[]): Settlement[] {
  const activeLoans = loans.filter((l) => !l.settled);
  // Map of "personA:::personB" -> net amount A owes B (or vice versa)
  const pairMap = new Map<string, number>();

  const getPairKey = (p1: string, p2: string) => {
    return p1 < p2 ? `${p1}:::${p2}` : `${p2}:::${p1}`;
  };

  for (const loan of activeLoans) {
    if (!loan.lender || !loan.borrower || loan.lender === loan.borrower) continue;
    const key = getPairKey(loan.lender, loan.borrower);
    const current = pairMap.get(key) || 0;
    // Let convention be: if lender comes first alphabetically, positive means borrower owes lender
    const isLenderFirst = loan.lender < loan.borrower;
    pairMap.set(key, current + (isLenderFirst ? loan.amount : -loan.amount));
  }

  const settlements: Settlement[] = [];
  for (const [key, net] of pairMap.entries()) {
    if (Math.abs(net) < 1) continue;
    const [p1, p2] = key.split(':::');
    if (net > 0) {
      // p1 is lender, p2 owes p1
      settlements.push({ from: p2, to: p1, amount: net });
    } else {
      // p2 is lender, p1 owes p2
      settlements.push({ from: p1, to: p2, amount: -net });
    }
  }

  return settlements.sort((a, b) => b.amount - a.amount);
}

/**
 * Calculates per-person net balance:
 * Positive = They are owed money overall (creditor)
 * Negative = They owe money overall (debtor)
 */
export function calculateIndividualBalances(loans: Loan[]): Record<string, number> {
  const balances: Record<string, number> = {};
  const activeLoans = loans.filter((l) => !l.settled);

  for (const loan of activeLoans) {
    if (!loan.lender || !loan.borrower || loan.lender === loan.borrower) continue;
    balances[loan.lender] = (balances[loan.lender] || 0) + loan.amount;
    balances[loan.borrower] = (balances[loan.borrower] || 0) - loan.amount;
  }

  return balances;
}

/**
 * Classic minimum cash flow simplification (Splitwise style)
 */
export function calculateOptimizedSettlements(loans: Loan[]): Settlement[] {
  const balances = calculateIndividualBalances(loans);
  
  const debtors: { person: string; amount: number }[] = [];
  const creditors: { person: string; amount: number }[] = [];

  for (const [person, balance] of Object.entries(balances)) {
    if (balance < -0.01) {
      debtors.push({ person, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ person, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: Math.round(settleAmount),
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return settlements;
}
