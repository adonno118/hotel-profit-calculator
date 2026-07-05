import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  setItem(key, value) { values.set(key, value); },
  getItem(key) { return values.get(key) ?? null; },
  removeItem(key) { values.delete(key); }
};

const { saveState, loadState, clearState } = await import('../public/js/storage.js');
const { mergeStoredState } = await import('../public/js/state.js');
const state = { version: 1, simple: { rooms: 30 } };
assert.equal(saveState(state), true);
assert.deepEqual(loadState(), state);
clearState();
assert.equal(loadState(), null);
values.set('motel-profit-calculator:v1', '{invalid json');
assert.equal(loadState(), null, '손상된 JSON은 무시');
clearState();

const restored = mergeStoredState({ version: 1, mode: 'unknown', simple: { deposit: 500000000, rent: 25000000, revenuePerRoom: 1800000 }, detailed: { investments: [{ id: 'old-deposit', name: '보증금', amount: 500000000 }], revenues: null, expenses: [null, {}], hybrid: null } });
assert.equal(restored.version, 3);
assert.equal(restored.mode, 'simple');
assert.equal(restored.simple.operationType, 'lodging');
assert.equal(restored.detailed.operationType, 'lodging');
assert.equal(restored.simple.deposit, 500000000, '기존 원 단위 보증금 유지');
assert.equal(restored.simple.rent, 25000000, '기존 원 단위 임대료 유지');
assert.equal(restored.simple.lodgingRevenuePerRoom, 1800000, '기존 객실당 매출은 숙박 매출로 이전');
assert.equal(restored.simple.monthlyStayRevenuePerRoom, 0, '기존 객실당 매출을 달방 매출로 자동 복제하지 않음');
assert.equal('revenuePerRoom' in restored.simple, false, '기존 공통 매출 필드 제거');
assert.ok(Array.isArray(restored.detailed.investments));
assert.equal(restored.detailed.investments.find((item) => item.name === '리모델링 비용').amount, 0, 'v1에 리모델링 비용 1회 추가');
assert.ok(Array.isArray(restored.detailed.revenues));
assert.ok(Array.isArray(restored.detailed.expenses));

const versionTwo = mergeStoredState({ version: 2, mode: 'detailed', simple: {}, detailed: { investments: [], revenues: [], expenses: [], hybrid: {} } });
assert.equal(versionTwo.detailed.investments.length, 0, 'v2에서 삭제한 기본 투자비를 다시 추가하지 않음');
assert.equal(versionTwo.version, 3);

const versionThree = mergeStoredState({ version: 3, mode: 'simple', simple: { lodgingRevenuePerRoom: 2000000, monthlyStayRevenuePerRoom: 700000 }, detailed: { investments: [], revenues: [], expenses: [], hybrid: {} } });
assert.equal(versionThree.simple.lodgingRevenuePerRoom, 2000000);
assert.equal(versionThree.simple.monthlyStayRevenuePerRoom, 700000, '운영방식을 바꿔도 별도 매출값 보존');
console.log('storage tests: passed');
