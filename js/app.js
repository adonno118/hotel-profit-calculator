import { SITE_CONFIG, applySiteMetadata } from './config/site-config.js';
import { ESTIMATION_CONFIG as C } from './config/estimation-config.js';
import { createInitialState, mergeStoredState, DEMO_STATE } from './state.js';
import { loadState, saveState, clearState } from './storage.js';
import { estimateSimple } from './calculator.js';
import { createUI } from './ui.js';
import { number, uid } from './utils.js';

applySiteMetadata();
let state = mergeStoredState(loadState());
let saveTimer;

function persist() {
  clearTimeout(saveTimer);
  document.querySelector('#save-status').textContent = '저장 중…';
  saveTimer = setTimeout(() => { document.querySelector('#save-status').textContent = saveState(state) ? '최근 입력값 자동 저장됨' : '이 브라우저에서는 저장할 수 없음'; }, 250);
}

function findAndSet(path, value) {
  if (path[1] && ['investments', 'revenues', 'expenses'].includes(path[1]) && path.length === 4) {
    const item = state.detailed[path[1]].find((row) => row.id === path[2]); if (item) item[path[3]] = value;
    return;
  }
  let target = state;
  for (let index = 0; index < path.length - 1; index++) target = target[path[index]];
  target[path.at(-1)] = value;
}

function estimateForKey(key) {
  const area = number(state.detailed.area);
  const payroll = state.detailed.expenses.filter((item) => item.name.includes('급여')).reduce((total, item) => total + number(item.amount), 0);
  return { electricity: area * C.utilities.electricityPerSqm, water: area * C.utilities.waterPerSqm, gas: area * C.utilities.gasPerSqm, payrollBurden: payroll * C.payroll.employerBurdenRate }[key] || 0;
}

function transferSimpleToDetailed() {
  const s = state.simple; const result = estimateSimple(s); const d = state.detailed;
  d.rooms = number(s.rooms); d.area = number(s.area); d.operationType = s.operationType;
  d.investments = [{ id: uid('inv'), name: '보증금', amount: number(s.deposit) }, { id: uid('inv'), name: '권리금', amount: number(s.premium) }];
  d.revenues = [{ id: uid('rev'), name: '객실 예상 매출', amount: result.revenue, type: s.operationType }];
  const labels = { rent: ['월세', 'fixed'], payroll: ['직원 급여', 'fixed'], payrollBurden: ['4대보험 등 사업주 부담 추정치', 'fixed'], electricity: ['전기요금 추정치', 'variable'], water: ['수도요금 추정치', 'variable'], gas: ['가스요금 추정치', 'variable'], platform: ['플랫폼 및 결제 비용 예상치', 'variable'], pmsCms: ['PMS & CMS 추정치', 'fixed'], communications: ['통신비 추정치', 'fixed'], insurance: ['보험료 추정치', 'fixed'], accounting: ['세무사 기장료 추정치', 'fixed'], maintenance: ['시설보수비 추정치', 'variable'], amenities: ['어매니티 추정치', 'variable'], laundry: ['세탁비 추정치', 'variable'], supplies: ['소모품비 추정치', 'variable'], other: ['기타 운영비 추정치', 'variable'] };
  d.expenses = Object.entries(result.details).map(([key, amount]) => ({ id: uid('exp'), name: labels[key][0], amount: Math.round(amount), category: labels[key][1], method: 'amount', estimateKey: ['electricity', 'water', 'gas', 'payrollBurden'].includes(key) ? key : null }));
  state.mode = 'detailed'; persist(); ui.renderAll(); document.querySelector('#detailed-title').scrollIntoView({ behavior: 'smooth' });
}

function add(kind) {
  if (kind === 'investment') state.detailed.investments.push({ id: uid('inv'), name: '새 투자비', amount: 0 });
  if (kind === 'revenue') state.detailed.revenues.push({ id: uid('rev'), name: '새 매출', amount: 0, type: 'other' });
  if (kind === 'expense') state.detailed.expenses.push({ id: uid('exp'), name: '새 비용', amount: 0, category: 'fixed', method: 'amount' });
  persist(); ui.renderLists(); ui.renderResults();
}

function structural(action, payload) {
  if (action === 'addExpenseTemplate') state.detailed.expenses.push({ id: uid('exp'), name: payload.name, amount: payload.estimateKey ? estimateForKey(payload.estimateKey) : 0, category: payload.category, method: payload.method || 'amount', rate: payload.rate || 0, estimateKey: payload.estimateKey || null });
  if (action === 'addRevenueTemplate') state.detailed.revenues.push({ id: uid('rev'), name: payload.name, amount: 0, type: payload.type });
  if (action === 'applyRoomRevenue') {
    const amount = number(state.detailed.rooms) * payload;
    const existing = state.detailed.revenues.find((item) => item.name === '객실 예상 매출');
    if (existing) existing.amount = amount; else state.detailed.revenues.push({ id: uid('rev'), name: '객실 예상 매출', amount, type: 'lodging' });
  }
  if (action === 'toggleExpenseMethod') { const item = state.detailed.expenses.find((row) => row.id === payload); if (item) item.method = item.method === 'rate' ? 'amount' : 'rate'; }
  persist(); ui.renderLists(); ui.renderResults();
}

const ui = createUI({
  getState: () => state,
  onMutate(path, value, rerender = true, listPath = false) { findAndSet(path, value); persist(); if (rerender) ui.renderInputs(); ui.renderResults(); if (listPath && path.at(-1) === 'category') ui.renderLists(); },
  onStructuralChange: structural,
  onModeChange(mode) { state.mode = mode; persist(); ui.renderMode(); ui.renderResults(); },
  onTransfer: transferSimpleToDetailed,
  onDemo() { state = mergeStoredState({ ...createInitialState(), ...DEMO_STATE, version: 1 }); persist(); ui.renderAll(); },
  onReset() { if (window.confirm('모든 입력값을 지우고 처음 상태로 돌아갈까요?')) { clearTimeout(saveTimer); clearState(); state = createInitialState(); ui.renderAll(); document.querySelector('#save-status').textContent = '입력값이 초기화됨'; } },
  onAdd: add,
  onRemove(kind, id) { state.detailed[`${kind}s`] = state.detailed[`${kind}s`].filter((item) => item.id !== id); persist(); ui.renderLists(); ui.renderResults(); },
  onApplyEstimate(id) { const item = state.detailed.expenses.find((row) => row.id === id); if (item?.estimateKey) item.amount = Math.round(estimateForKey(item.estimateKey)); persist(); ui.renderLists(); ui.renderResults(); }
});

ui.renderAll();

window.__MOTEL_CALCULATOR__ = { getState: () => structuredClone(state), siteConfig: SITE_CONFIG };
