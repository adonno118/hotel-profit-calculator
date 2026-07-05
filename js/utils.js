export const KRW = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
export const uid = (prefix = 'item') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export function number(value, { min = 0, max = 999999999999999 } = {}) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(min, parsed));
}
export const won = (value) => `${KRW.format(Math.round(number(value, { min: -999999999999999 })))}원`;
export const formatInput = (value) => value === '' ? '' : KRW.format(number(value));
export const percent = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '계산 불가';
export const years = (value) => Number.isFinite(value) && value > 0 ? `${value.toFixed(2)}년` : '회수기간 산정 불가';
export const sum = (items, selector = (x) => x) => items.reduce((total, item) => total + number(selector(item), { min: -999999999999999 }), 0);
