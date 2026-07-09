export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const cur = (currency || 'USD').toUpperCase();

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
