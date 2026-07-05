import { uid } from './utils.js';

export const DEMO_STATE = {
  mode: 'simple',
  simple: { area: 1200, rooms: 32, deposit: 200000000, rent: 25000000, revenuePerRoom: 2000000, premium: 300000000, employees: 3, salaryPerEmployee: 3000000, operationType: 'lodging' }
};

export function createInitialState() {
  return {
    version: 1, mode: 'simple',
    simple: { area: 0, rooms: 0, deposit: 0, rent: 0, revenuePerRoom: 0, premium: 0, employees: 0, salaryPerEmployee: 0, operationType: 'lodging' },
    detailed: {
      rooms: 0, area: 0, operationType: 'lodging', hybrid: { lodgingRooms: 0, monthlyRooms: 0 },
      investments: [{ id: uid('inv'), name: '보증금', amount: 0 }, { id: uid('inv'), name: '권리금', amount: 0 }],
      revenues: [{ id: uid('rev'), name: '숙박 매출', amount: 0, type: 'lodging' }],
      expenses: []
    }
  };
}

export function mergeStoredState(stored) {
  const base = createInitialState();
  if (!stored || stored.version !== 1) return base;
  const simple = stored.simple && typeof stored.simple === 'object' ? stored.simple : {};
  const detailed = stored.detailed && typeof stored.detailed === 'object' ? stored.detailed : {};
  const hybrid = detailed.hybrid && typeof detailed.hybrid === 'object' ? detailed.hybrid : {};
  const operationTypes = ['lodging', 'monthly', 'hybrid'];
  const rows = (value, fallback) => Array.isArray(value)
    ? value.filter((row) => row && typeof row === 'object' && typeof row.id === 'string' && typeof row.name === 'string')
    : fallback;
  return {
    ...base,
    mode: stored.mode === 'detailed' ? 'detailed' : 'simple',
    simple: { ...base.simple, ...simple, operationType: operationTypes.includes(simple.operationType) ? simple.operationType : base.simple.operationType },
    detailed: {
      ...base.detailed,
      ...detailed,
      operationType: operationTypes.includes(detailed.operationType) ? detailed.operationType : base.detailed.operationType,
      hybrid: { ...base.detailed.hybrid, ...hybrid },
      investments: rows(detailed.investments, base.detailed.investments),
      revenues: rows(detailed.revenues, base.detailed.revenues),
      expenses: rows(detailed.expenses, base.detailed.expenses)
    }
  };
}
