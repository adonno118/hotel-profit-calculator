import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  setItem(key, value) { values.set(key, value); },
  getItem(key) { return values.get(key) ?? null; },
  removeItem(key) { values.delete(key); }
};

const { saveState, loadState, clearState } = await import('../js/storage.js');
const { mergeStoredState } = await import('../js/state.js');
const state = { version: 1, simple: { rooms: 30 } };
assert.equal(saveState(state), true);
assert.deepEqual(loadState(), state);
clearState();
assert.equal(loadState(), null);
values.set('motel-profit-calculator:v1', '{invalid json');
assert.equal(loadState(), null, '손상된 JSON은 무시');
clearState();

const restored = mergeStoredState({ version: 1, mode: 'unknown', simple: null, detailed: { investments: null, revenues: null, expenses: [null, {}], hybrid: null } });
assert.equal(restored.mode, 'simple');
assert.equal(restored.simple.operationType, 'lodging');
assert.equal(restored.detailed.operationType, 'lodging');
assert.ok(Array.isArray(restored.detailed.investments));
assert.ok(Array.isArray(restored.detailed.revenues));
assert.ok(Array.isArray(restored.detailed.expenses));
console.log('storage tests: passed');
