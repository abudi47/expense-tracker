export function formatCurrency(amount: number, currency: string = 'ETB'): string {
  const cur = (currency || 'ETB').toUpperCase();

  if (cur === 'ETB') {
    return (
      new Intl.NumberFormat('en-ET', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' Br'
    );
  }

  if (cur === 'USDT') {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' USDT'
    );
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) +
      ' ' +
      cur
    );
  }
}

/** Short label for chips */
export function currencyLabel(currency: string = 'ETB'): string {
  const cur = (currency || 'ETB').toUpperCase();
  if (cur === 'ETB') return 'Br';
  if (cur === 'USDT') return 'USDT';
  return cur;
}

export function currencyChipColor(currency: string = 'ETB'): string {
  const cur = (currency || 'ETB').toUpperCase();
  if (cur === 'USDT') return '#0D9488';
  if (cur === 'ETB') return '#D97706';
  if (cur === 'USD') return '#2563EB';
  return '#64748B';
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function toInputDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
