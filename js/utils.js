export const KRW = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
export const uid = (prefix = 'item') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export function number(value, { min = 0, max = 999999999999999 } = {}) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(min, parsed));
}
export const won = (value) => `${KRW.format(Math.round(number(value, { min: -999999999999999 })))}원`;
export const formatInput = (value) => value === '' ? '' : KRW.format(number(value));
export const toWon = (value, unit) => number(value) * unit;
export const fromWon = (value, unit) => number(value) / unit;
export const formatDecimalInput = (value, maximumFractionDigits = 2) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(number(value));
export function compactWon(value) {
  const amount = number(value, { min: -999999999999999 });
  const absolute = Math.abs(amount);
  if (absolute >= 100000000) return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(amount / 100000000)}억원`;
  if (absolute >= 10000) return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(amount / 10000)}만원`;
  return won(amount);
}
export const percent = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '계산 불가';
export const years = (value) => Number.isFinite(value) && value > 0 ? `${value.toFixed(2)}년` : '회수기간 산정 불가';
export const sum = (items, selector = (x) => x) => items.reduce((total, item) => total + number(selector(item), { min: -999999999999999 }), 0);
