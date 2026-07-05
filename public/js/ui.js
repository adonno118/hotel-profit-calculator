import { LODGING_REVENUE_PRESETS, MONTHLY_STAY_REVENUE_PRESETS } from './config/estimation-config.js';
import { EXPENSE_TEMPLATES } from './config/expense-templates.js';
import { REVENUE_TEMPLATES } from './config/revenue-templates.js';
import { estimateSimple, calculateDetailed, compareScenarios, expenseAmount } from './calculator.js';
import { compactWon, formatDecimalInput, formatInput, formatWonToBaekmanwon, formatWonToEokwon, formatWonToManwon, fromWon, number, percent, toWon, won, years } from './utils.js';

const $ = (selector) => document.querySelector(selector);
const SIMPLE_MONEY_UNITS = { deposit: 100000000, premium: 100000000, rent: 1000000, lodgingRevenuePerRoom: 10000, monthlyStayRevenuePerRoom: 10000 };
function formatNumericInput(input, value) {
  const caret = input.selectionStart ?? input.value.length;
  const digitsBefore = (input.value.slice(0, caret).match(/\d/g) || []).length;
  input.value = formatInput(value);
  if (document.activeElement === input && input.setSelectionRange) {
    let position = 0, seen = 0;
    while (position < input.value.length && seen < digitsBefore) {
      if (/\d/.test(input.value[position])) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
  }
}
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const moneyOrDash = (value) => value === null || !Number.isFinite(value) ? '계산 불가' : won(value);
export function getProfitMarginStatus(margin) {
  return Number.isFinite(margin) && margin >= 20
    ? { key: 'good', text: '수익성 지표 양호' }
    : { key: 'warning', text: '주의: 영업이익률 20% 미만' };
}

function primaryCards(result, simple = false) {
  const loss = result.monthlyProfit < 0;
  return [
    ['예상 월매출', result.revenue, ''],
    [simple ? '예상 월 운영비' : '월 총비용', result.expense, ''],
    [loss ? '예상 영업손실' : '예상 월 영업이익', result.monthlyProfit, loss ? 'loss' : 'profit'],
    ['영업이익률', result.margin, 'percent']
  ].map(([label, value, type]) => {
    if (type === 'percent') return `<div class="result-box ${type}"><span class="label">${label}</span><strong class="result-value">${value === null ? '계산 불가' : percent(value)}</strong></div>`;
    return `<div class="result-box ${type}"><span class="label">${label}</span><strong class="result-value"><span class="result-value-main">${compactWon(value)}</span><small class="result-value-sub">(${formatWonToBaekmanwon(value)})</small></strong></div>`;
  }).join('');
}

function secondaryMetrics(result, simple = false) {
  const rows = simple ? [
    ['예상 연 영업이익', formatWonToManwon(result.annualProfit)], ['총 초기 투자금', formatWonToEokwon(result.investment)],
    ['1억당 월 예상이익', result.monthlyPerHundredM === null ? '계산 불가' : formatWonToManwon(result.monthlyPerHundredM)], ['1억당 연 예상이익', result.annualPerHundredM === null ? '계산 불가' : formatWonToManwon(result.annualPerHundredM)],
    ['투자수익률 참고값', result.roi === null ? '계산 불가' : percent(result.roi)], ['예상 투자 회수기간', years(result.paybackYears)]
  ] : [
    ['연 예상 영업이익', won(result.annualProfit)], ['총 고정비', won(result.fixed)], ['총 변동비', won(result.variable)],
    ['객실당 월 매출', moneyOrDash(result.revenuePerRoom)], ['객실당 월 영업이익', moneyOrDash(result.profitPerRoom)],
    ['1억당 월 순익', moneyOrDash(result.monthlyPerHundredM)], ['1억당 연 순익', moneyOrDash(result.annualPerHundredM)],
    ['투자수익률 참고값', result.roi === null ? '계산 불가' : percent(result.roi)], ['예상 투자 회수기간', years(result.paybackYears)]
  ];
  return rows.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

export function createUI({ getState, onMutate, onStructuralChange, onModeChange, onTransfer, onDemo, onReset, onAdd, onRemove, onApplyEstimate }) {
  const state = () => getState();

  function renderMode() {
    const mode = state().mode;
    $('#simple-mode').hidden = mode !== 'simple';
    $('#detailed-mode').hidden = mode !== 'detailed';
    document.querySelectorAll('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  }

  function renderInputs() {
    document.querySelectorAll('[data-simple]').forEach((input) => {
      const value = state().simple[input.dataset.simple];
      const unit = SIMPLE_MONEY_UNITS[input.dataset.simple];
      input.value = input.tagName === 'SELECT' ? value : unit ? formatDecimalInput(fromWon(value, unit)) : formatInput(value);
    });
    document.querySelectorAll('[data-detail]').forEach((input) => {
      const value = state().detailed[input.dataset.detail];
      input.value = input.tagName === 'SELECT' ? value : formatInput(value);
    });
    document.querySelectorAll('[data-hybrid]').forEach((input) => { input.value = formatInput(state().detailed.hybrid[input.dataset.hybrid]); });
    $('#simple-pyeong').textContent = `${(number(state().simple.area) / 3.3058).toFixed(1)}평 · 공과금 추정 기준`;
    $('#detail-pyeong').textContent = `${(number(state().detailed.area) / 3.3058).toFixed(1)}평`;
    $('#hybrid-fields').hidden = state().detailed.operationType !== 'hybrid';
    const simpleOperationType = state().simple.operationType;
    $('#simple-hybrid-fields').hidden = simpleOperationType !== 'hybrid';
    $('#simple-lodging-revenue-field').hidden = simpleOperationType === 'monthly';
    $('#simple-monthly-revenue-field').hidden = simpleOperationType === 'lodging';
    const simpleRooms = number(state().simple.rooms);
    const simpleUsed = number(state().simple.lodgingRooms) + number(state().simple.monthlyRooms);
    $('#simple-hybrid-warning').textContent = simpleOperationType === 'hybrid' && simpleUsed > simpleRooms
      ? `객실 배분 합계 ${simpleUsed}실이 전체 ${simpleRooms}실을 초과합니다. 계산에서는 초과 객실을 제외합니다.`
      : '';
  }

  function renderQuickButtons() {
    const lodgingButtons = LODGING_REVENUE_PRESETS.map((amount) => `<button type="button" data-quick-lodging-revenue="${amount}">${Math.round(amount / 10000)}만원</button>`).join('');
    const monthlyButtons = MONTHLY_STAY_REVENUE_PRESETS.map((amount) => `<button type="button" data-quick-monthly-revenue="${amount}">${Math.round(amount / 10000)}만원</button>`).join('');
    $('#simple-lodging-revenue-quick').innerHTML = lodgingButtons;
    $('#simple-monthly-revenue-quick').innerHTML = monthlyButtons;
    $('#detail-revenue-quick').innerHTML = lodgingButtons.replaceAll('data-quick-lodging-revenue', 'data-detail-quick-revenue');
    $('#revenue-template-quick').innerHTML = REVENUE_TEMPLATES.map((item, index) => `<button type="button" data-revenue-template="${index}">${escapeHtml(item.name)}</button>`).join('');
    $('#expense-quick').innerHTML = EXPENSE_TEMPLATES.map((item, index) => `<button type="button" data-expense-template="${index}">${escapeHtml(item.name)}</button>`).join('');
  }

  function renderLists() {
    const d = state().detailed;
    $('#investment-list').innerHTML = d.investments.map((item) => `<div class="item-row investment" data-row-id="${item.id}"><label><span class="sr-only">투자비 항목명</span><input value="${escapeHtml(item.name)}" data-item-name="investment" data-id="${item.id}" aria-label="투자비 항목명"></label><div class="unit-input"><input class="money-field" value="${formatInput(item.amount)}" data-item-amount="investment" data-id="${item.id}" inputmode="numeric" aria-label="${escapeHtml(item.name)} 금액"><b>원</b></div><button class="icon-button" data-remove="investment" data-id="${item.id}" type="button" aria-label="${escapeHtml(item.name)} 삭제">×</button></div>`).join('');
    $('#revenue-list').innerHTML = d.revenues.map((item) => `<div class="item-row revenue" data-row-id="${item.id}"><input value="${escapeHtml(item.name)}" data-item-name="revenue" data-id="${item.id}" aria-label="매출 항목명"><div class="unit-input"><input class="money-field" value="${formatInput(item.amount)}" data-item-amount="revenue" data-id="${item.id}" inputmode="numeric" aria-label="${escapeHtml(item.name)} 금액"><b>원</b></div><button class="icon-button" data-remove="revenue" data-id="${item.id}" type="button" aria-label="${escapeHtml(item.name)} 삭제">×</button></div>`).join('');
    const revenueTotal = d.revenues.reduce((sum, item) => sum + number(item.amount), 0);
    $('#expense-list').innerHTML = d.expenses.map((item) => {
      const estimateButton = item.estimateKey ? `<button type="button" class="estimate-apply" data-apply-estimate="${item.id}">현재 기준 추정값 적용</button>` : '';
      const valueField = item.method === 'rate'
        ? `<div class="unit-input"><input class="money-field" value="${number(item.rate)}" data-expense-value="rate" data-id="${item.id}" inputmode="decimal" aria-label="${escapeHtml(item.name)} 비율"><b>%</b></div>`
        : `<div><div class="unit-input"><input class="money-field" value="${formatInput(item.amount)}" data-expense-value="amount" data-id="${item.id}" inputmode="numeric" aria-label="${escapeHtml(item.name)} 금액"><b>원</b></div>${estimateButton}</div>`;
      const lodgingRevenue = d.revenues.filter((revenue) => revenue.type === 'lodging').reduce((total, revenue) => total + number(revenue.amount), 0);
      const calculated = item.method === 'rate' ? `<small data-calculated-expense="${item.id}">${won(expenseAmount(item, revenueTotal, lodgingRevenue))}</small>` : '';
      return `<div class="item-row expense" data-row-id="${item.id}"><div><input value="${escapeHtml(item.name)}" data-item-name="expense" data-id="${item.id}" aria-label="비용 항목명">${calculated}</div>${valueField}<select data-expense-category data-id="${item.id}" aria-label="${escapeHtml(item.name)} 구분"><option value="fixed" ${item.category === 'fixed' ? 'selected' : ''}>고정비</option><option value="variable" ${item.category === 'variable' ? 'selected' : ''}>변동비</option></select><button class="icon-button" data-remove="expense" data-id="${item.id}" type="button" aria-label="${escapeHtml(item.name)} 삭제">×</button>${item.method === 'rate' || item.name.includes('수수료') ? `<button type="button" class="method-toggle" data-method-toggle="${item.id}">${item.method === 'rate' ? '직접 금액으로 입력' : '매출 비율로 입력'}</button>` : ''}</div>`;
    }).join('');
  }

  function renderSimpleResults() {
    const result = estimateSimple(state().simple);
    $('#simple-pyeong').textContent = `${(number(state().simple.area) / 3.3058).toFixed(1)}평 · 공과금 추정 기준`;
    $('#simple-primary-results').innerHTML = primaryCards(result, true);
    $('#simple-secondary-results').innerHTML = secondaryMetrics(result, true);
    const status = getProfitMarginStatus(result.margin);
    const resultsPanel = $('#simple-results-panel');
    resultsPanel.dataset.status = status.key;
    const statusNode = $('#simple-result-status');
    statusNode.dataset.status = status.key;
    statusNode.textContent = status.text;
    const composition = $('#simple-revenue-composition');
    composition.hidden = state().simple.operationType !== 'hybrid';
    composition.innerHTML = `<h3>예상 매출 구성</h3><div><span>숙박 예상 매출</span><strong>${compactWon(result.lodgingRevenue)} <small>(${formatWonToBaekmanwon(result.lodgingRevenue)})</small></strong></div><div><span>달방 예상 매출</span><strong>${compactWon(result.monthlyStayRevenue)} <small>(${formatWonToBaekmanwon(result.monthlyStayRevenue)})</small></strong></div><div class="total"><span>총 예상 매출</span><strong>${compactWon(result.revenue)} <small>(${formatWonToBaekmanwon(result.revenue)})</small></strong></div>`;
    const names = { rent: '월 임대료', cleaningLabor: '청소 인건비 추정치', payrollBurden: '4대보험 등 사업주 부담 추정치', electricity: '전기요금 추정치', water: '수도요금 추정치', gas: '가스요금 추정치', platform: '플랫폼 및 결제 비용 예상치', pmsCms: 'PMS/CMS 추정치', communications: '통신비 추정치', insurance: '보험료 월 환산 추정치', accounting: '세무 기장료 추정치', amenities: '어매니티·기본 소모품 추정치', laundry: '외부 세탁비 추정치' };
    $('#simple-breakdown').innerHTML = Object.entries(result.details).map(([key, value]) => `<div class="breakdown-row"><span>${names[key]}</span><strong>${won(value)}</strong></div>`).join('');
  }

  function renderDetailedResults() {
    const result = calculateDetailed(state().detailed);
    $('#detail-pyeong').textContent = `${(number(state().detailed.area) / 3.3058).toFixed(1)}평`;
    $('#detail-primary-results').innerHTML = primaryCards(result);
    $('#detail-secondary-results').innerHTML = secondaryMetrics(result);
    $('#investment-total').textContent = won(result.investment);
    $('#revenue-total').textContent = won(result.revenue);
    $('#fixed-total').textContent = won(result.fixed);
    $('#variable-total').textContent = won(result.variable);
    state().detailed.expenses.filter((item) => item.method === 'rate').forEach((item) => {
      const output = document.querySelector(`[data-calculated-expense="${item.id}"]`);
      if (output) output.textContent = won(expenseAmount(item, result.revenue, result.lodgingRevenue));
    });
    const rooms = number(state().detailed.rooms);
    const used = number(state().detailed.hybrid.lodgingRooms) + number(state().detailed.hybrid.monthlyRooms);
    $('#hybrid-warning').textContent = used > rooms ? `객실 배분 합계 ${used}실이 전체 ${rooms}실을 초과합니다. 비교 계산에서는 초과분을 제한합니다.` : '';
    $('#scenario-results').innerHTML = compareScenarios(state().detailed).map((item) => `<article class="scenario-card ${item.key === state().detailed.operationType ? 'current' : ''}"><h4>${item.label}${item.key === state().detailed.operationType ? ' <span class="status-tag">현재 선택</span>' : ''}</h4><span>월 영업이익</span><strong>${won(item.monthlyProfit)}</strong><dl><div><dt>월 매출</dt><dd>${won(item.revenue)}</dd></div><div><dt>월 비용</dt><dd>${won(item.expense)}</dd></div><div><dt>이익률</dt><dd>${item.margin === null ? '계산 불가' : percent(item.margin)}</dd></div><div><dt>객실당 이익</dt><dd>${moneyOrDash(item.profitPerRoom)}</dd></div><div><dt>1억당 월 순익</dt><dd>${moneyOrDash(item.monthlyPerHundredM)}</dd></div></dl></article>`).join('');
  }

  function updateMobile(result) {
    $('#mobile-summary').innerHTML = `<div><span>월 매출</span><strong>${won(result.revenue)}</strong></div><div><span>${result.monthlyProfit < 0 ? '월 손실' : '월 이익'}</span><strong class="${result.monthlyProfit < 0 ? 'loss' : ''}">${won(result.monthlyProfit)}</strong></div>`;
  }

  function renderResults() {
    renderSimpleResults();
    renderDetailedResults();
    updateMobile(state().mode === 'simple' ? estimateSimple(state().simple) : calculateDetailed(state().detailed));
  }
  function renderAll() { renderMode(); renderInputs(); renderQuickButtons(); renderLists(); renderResults(); }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.mode) onModeChange(button.dataset.mode);
    else if (button.id === 'load-demo') onDemo();
    else if (button.id === 'reset-all') onReset();
    else if (button.id === 'to-detailed') onTransfer();
    else if (button.dataset.add) onAdd(button.dataset.add);
    else if (button.dataset.remove) onRemove(button.dataset.remove, button.dataset.id);
    else if (button.dataset.quickLodgingRevenue) onMutate(['simple', 'lodgingRevenuePerRoom'], number(button.dataset.quickLodgingRevenue));
    else if (button.dataset.quickMonthlyRevenue) onMutate(['simple', 'monthlyStayRevenuePerRoom'], number(button.dataset.quickMonthlyRevenue));
    else if (button.dataset.detailQuickRevenue) { $('#detail-per-room').value = formatInput(button.dataset.detailQuickRevenue); }
    else if (button.id === 'apply-room-revenue') onStructuralChange('applyRoomRevenue', number($('#detail-per-room').value));
    else if (button.dataset.expenseTemplate) onStructuralChange('addExpenseTemplate', EXPENSE_TEMPLATES[number(button.dataset.expenseTemplate)]);
    else if (button.dataset.revenueTemplate) onStructuralChange('addRevenueTemplate', REVENUE_TEMPLATES[number(button.dataset.revenueTemplate)]);
    else if (button.dataset.applyEstimate) onApplyEstimate(button.dataset.applyEstimate);
    else if (button.dataset.methodToggle) onStructuralChange('toggleExpenseMethod', button.dataset.methodToggle);
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('[data-simple]') && input.tagName !== 'SELECT') {
      const unit = SIMPLE_MONEY_UNITS[input.dataset.simple];
      const displayValue = number(input.value);
      if (!unit) formatNumericInput(input, displayValue);
      onMutate(['simple', input.dataset.simple], unit ? toWon(displayValue, unit) : displayValue, false);
    }
    else if (input.matches('[data-detail]') && input.tagName !== 'SELECT') { const value = number(input.value); formatNumericInput(input, value); onMutate(['detailed', input.dataset.detail], value, false); }
    else if (input.matches('[data-hybrid]')) { const value = number(input.value); formatNumericInput(input, value); onMutate(['detailed', 'hybrid', input.dataset.hybrid], value, false); }
    else if (input.dataset.itemName) onMutate(['detailed', `${input.dataset.itemName}s`, input.dataset.id, 'name'], input.value, false, true);
    else if (input.dataset.itemAmount) { const value = number(input.value); formatNumericInput(input, value); onMutate(['detailed', `${input.dataset.itemAmount}s`, input.dataset.id, 'amount'], value, false, true); }
    else if (input.dataset.expenseValue) { const value = number(input.value, { max: input.dataset.expenseValue === 'rate' ? 100 : 999999999999999 }); if (input.dataset.expenseValue === 'rate') input.value = value; else formatNumericInput(input, value); onMutate(['detailed', 'expenses', input.dataset.id, input.dataset.expenseValue], value, false, true); }
  });

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input.matches('[data-simple]') && input.tagName === 'SELECT') onMutate(['simple', input.dataset.simple], input.value);
    else if (input.matches('[data-detail]') && input.tagName === 'SELECT') onMutate(['detailed', input.dataset.detail], input.value);
    else if (input.matches('[data-expense-category]')) onMutate(['detailed', 'expenses', input.dataset.id, 'category'], input.value, false, true);
  });

  return { renderAll, renderMode, renderInputs, renderLists, renderResults };
}
