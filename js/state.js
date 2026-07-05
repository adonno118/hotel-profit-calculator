import { uid } from './utils.js';

export const DEMO_STATE = {
  mode: 'simple',
  simple: { area: 1200, rooms: 32, deposit: 200000000, rent: 25000000, lodgingRevenuePerRoom: 2000000, monthlyStayRevenuePerRoom: 800000, premium: 300000000, lodgingRooms: 20, monthlyRooms: 12, operationType: 'lodging' }
};

export function createInitialState() {
  return {
    version: 3, mode: 'simple',
    simple: { area: 0, rooms: 0, deposit: 0, rent: 0, lodgingRevenuePerRoom: 0, monthlyStayRevenuePerRoom: 0, premium: 0, lodgingRooms: 0, monthlyRooms: 0, operationType: 'lodging' },
    detailed: {
      rooms: 0, area: 0, operationType: 'lodging', hybrid: { lodgingRooms: 0, monthlyRooms: 0 },
      investments: [{ id: uid('inv'), name: '보증금', amount: 0 }, { id: uid('inv'), name: '권리금', amount: 0 }, { id: uid('inv'), name: '리모델링 비용', amount: 0 }],
      revenues: [{ id: uid('rev'), name: '숙박 매출', amount: 0, type: 'lodging' }],
      expenses: []
    }
  };
}

export function mergeStoredState(stored) {
  const base = createInitialState();
  if (!stored || ![1, 2, 3].includes(stored.version)) return base;
  const simple = stored.simple && typeof stored.simple === 'object' ? stored.simple : {};
  const detailed = stored.detailed && typeof stored.detailed === 'object' ? stored.detailed : {};
  const hybrid = detailed.hybrid && typeof detailed.hybrid === 'object' ? detailed.hybrid : {};
  const operationTypes = ['lodging', 'monthly', 'hybrid'];
  const rows = (value, fallback) => Array.isArray(value)
    ? value.filter((row) => row && typeof row === 'object' && typeof row.id === 'string' && typeof row.name === 'string')
    : fallback;
  const investments = rows(detailed.investments, base.detailed.investments);
  const migratedInvestments = stored.version === 1 && !investments.some((item) => item.name === '리모델링 비용')
    ? [...investments, { id: uid('inv'), name: '리모델링 비용', amount: 0 }]
    : investments;
  const { revenuePerRoom: legacyRevenuePerRoom, ...simpleFields } = simple;
  const lodgingRevenuePerRoom = simple.lodgingRevenuePerRoom ?? legacyRevenuePerRoom ?? 0;
  const monthlyStayRevenuePerRoom = simple.monthlyStayRevenuePerRoom ?? 0;
  return {
    ...base,
    mode: stored.mode === 'detailed' ? 'detailed' : 'simple',
    simple: { ...base.simple, ...simpleFields, lodgingRevenuePerRoom, monthlyStayRevenuePerRoom, operationType: operationTypes.includes(simple.operationType) ? simple.operationType : base.simple.operationType },
    detailed: {
      ...base.detailed,
      ...detailed,
      operationType: operationTypes.includes(detailed.operationType) ? detailed.operationType : base.detailed.operationType,
      hybrid: { ...base.detailed.hybrid, ...hybrid },
      investments: migratedInvestments,
      revenues: rows(detailed.revenues, base.detailed.revenues),
      expenses: rows(detailed.expenses, base.detailed.expenses)
    }
  };
}
