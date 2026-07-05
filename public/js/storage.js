const STORAGE_KEY = 'motel-profit-calculator:v1';
export function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
export function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function clearState() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
