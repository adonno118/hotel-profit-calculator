import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  estimateHybridCleaningCost,
  estimateLodgingCleaningCost,
  estimateMonthlyStayCleaningCost,
  estimateSimple,
  metrics
} from '../public/js/calculator.js';

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const index = await readFile(join(publicRoot, 'index.html'), 'utf8');
const guideHub = await readFile(join(publicRoot, 'guide.html'), 'utf8');
const contentCss = await readFile(join(publicRoot, 'css', 'content.css'), 'utf8');
const profitGuide = await readFile(join(publicRoot, 'guide', 'hotel-profit-calculation.html'), 'utf8');
const breakEvenGuide = await readFile(join(publicRoot, 'guide', 'motel-break-even-point.html'), 'utf8');
const laborGuide = await readFile(join(publicRoot, 'guide', 'motel-labor-cost.html'), 'utf8');
const revenuePerRoomGuide = await readFile(join(publicRoot, 'guide', 'motel-revenue-per-room.html'), 'utf8');
const laundryGuide = await readFile(join(publicRoot, 'guide', 'motel-laundry-cost.html'), 'utf8');
const platformGuide = await readFile(join(publicRoot, 'guide', 'lodging-platform-fee.html'), 'utf8');
const monthlyStayGuide = await readFile(join(publicRoot, 'guide', 'monthly-stay-profit.html'), 'utf8');
const hybridGuide = await readFile(join(publicRoot, 'guide', 'hybrid-operation-profit.html'), 'utf8');
const roiGuide = await readFile(join(publicRoot, 'guide', 'motel-roi-payback.html'), 'utf8');
const rentGuide = await readFile(join(publicRoot, 'guide', 'motel-rent-affordability.html'), 'utf8');
const lodgingExampleHtml = await readFile(join(publicRoot, 'examples', '30-room-lodging-example.html'), 'utf8');
const hybridExampleHtml = await readFile(join(publicRoot, 'examples', '32-room-hybrid-example.html'), 'utf8');
const lodgingTwentyHtml = await readFile(join(publicRoot, 'examples', '20-room-lodging-example.html'), 'utf8');
const lodgingThirtyFiveHtml = await readFile(join(publicRoot, 'examples', '35-room-lodging-example.html'), 'utf8');
const monthlyThirtyHtml = await readFile(join(publicRoot, 'examples', '30-room-monthly-stay-example.html'), 'utf8');

const guideFiles = (await readdir(join(publicRoot, 'guide'))).filter((file) => file.endsWith('.html')).sort();
assert.deepEqual(guideFiles, [
  'hotel-profit-calculation.html',
  'hybrid-operation-profit.html',
  'lodging-platform-fee.html',
  'monthly-stay-profit.html',
  'motel-break-even-point.html',
  'motel-labor-cost.html',
  'motel-laundry-cost.html',
  'motel-rent-affordability.html',
  'motel-revenue-per-room.html',
  'motel-roi-payback.html'
], '가이드 파일은 기존 7개와 3차 신규 3개여야 함');
const exampleFiles = (await readdir(join(publicRoot, 'examples'))).filter((file) => file.endsWith('.html')).sort();
assert.deepEqual(exampleFiles, ['20-room-lodging-example.html', '30-room-lodging-example.html', '30-room-monthly-stay-example.html', '32-room-hybrid-example.html', '35-room-lodging-example.html'], '대표 사례 페이지는 정확히 5개여야 함');

const sample = estimateSimple({
  rooms: 30,
  lodgingRooms: 20,
  monthlyRooms: 10,
  lodgingRevenuePerRoom: 1800000,
  monthlyStayRevenuePerRoom: 900000,
  operationType: 'hybrid'
});
assert.equal(sample.revenue, sample.lodgingRevenue + sample.monthlyStayRevenue, '혼합형 총매출 공식');
assert.equal(sample.monthlyProfit, sample.revenue - sample.expense, '월 영업이익 공식');
assert.equal(sample.annualProfit, sample.monthlyProfit * 12, '연간 영업이익 공식');
assert.ok(index.includes('숙박 객실 매출 + 달방 객실 매출'), '메인 혼합형 매출 설명 누락');
assert.ok(profitGuide.includes('월 영업이익 = 예상 월매출 − 예상 월 운영비'), '수익률 가이드 월 영업이익 공식 누락');
assert.ok(breakEvenGuide.includes('월 영업이익이 0원이 되는 매출 수준이 손익분기점'), '손익분기점 직접 설명 누락');

const lodgingRows = [
  ['1~5실', 5, 1000000],
  ['6~10실', 10, 2000000],
  ['11~14실', 14, 3000000],
  ['15실', 15, 3500000],
  ['16~20실', 20, 4500000],
  ['21~25실', 25, 5500000],
  ['26~29실', 29, 6500000],
  ['30실', 30, 7000000]
];
for (const [label, rooms, expected] of lodgingRows) {
  assert.equal(estimateLodgingCleaningCost(rooms), expected, `${label}: 엔진 청소비 불일치`);
  assert.ok(laborGuide.includes(`<tr><td>${label}</td><td>월 ${expected / 10000}만원</td>`), `${label}: 가이드 표 금액 불일치`);
}

assert.equal(estimateMonthlyStayCleaningCost(1), 500000);
assert.equal(estimateMonthlyStayCleaningCost(20), 500000);
assert.equal(estimateMonthlyStayCleaningCost(21), 1000000);
assert.equal(estimateHybridCleaningCost(14), 0);
assert.equal(estimateHybridCleaningCost(15), 3500000);
assert.match(laborGuide, /ceil\(전체 객실 수 ÷ 20\) × 50만원/);
assert.match(laborGuide, /floor\(숙박 배정 객실 수 ÷ 15\) × 350만원/);

assert.match(revenuePerRoomGuide, /예상 총 월매출 = 운영 객실 수 × 객실당 예상 월매출/);
assert.match(revenuePerRoomGuide, /혼합형 총매출 = 숙박형 매출 \+ 달방형 매출/);
assert.match(laundryGuide, /400만원 ÷ 35객실/);
assert.match(laundryGuide, /StayCalculators 간편 분석을 위한 참고 추정 모델/);
assert.match(laundryGuide, /개인 침구 지참.*가능/);
assert.match(monthlyStayGuide, /외주 린넨·세탁비 0원 기본 가정/);
assert.match(monthlyStayGuide, /개인 침구 지참.*가능/);
assert.match(monthlyStayGuide, /ceil\(전체 객실 수 ÷ 20\) × 50만원/);
assert.match(monthlyStayGuide, /PMS\/CMS를 0원/);
assert.match(platformGuide, /플랫폼·결제 비용 = 숙박 매출 × 설정 비율/);
assert.match(platformGuide, /총 5,000만원이 아니라 숙박 매출 3,000만원/);

assert.match(hybridGuide, /총 월매출 = 숙박 매출 \+ 달방 매출/);
assert.match(hybridGuide, /플랫폼·결제 비용 = 숙박 매출 × 설정 비율/);
assert.match(hybridGuide, /floor\(숙박 배정 객실 수 ÷ 15\) × 350만원/);
assert.match(hybridGuide, /혼합형 외주 린넨·세탁비는.*숙박 객실 수/s);
assert.match(hybridGuide, /PMS\/CMS는 숙박 객실이 1실 이상.*전체 객실 수/s);
assert.match(hybridGuide, /숙박 객실이 0실이면 0원/);
assert.match(laundryGuide, /혼합형은.*숙박 배정 객실 수/s);
assert.equal(sample.details.cleaningLabor, 3500000, '혼합형 20실 숙박 배정 청소비');
assert.ok(Math.abs(sample.details.laundry - 20 * (4000000 / 35)) < 0.001, '혼합형 세탁비는 숙박 객실 수 기준');
assert.ok(sample.details.pmsCms > 0, '혼합형에 숙박 객실이 있으면 PMS/CMS 적용');
const zeroLodgingHybrid = estimateSimple({ rooms: 30, lodgingRooms: 0, monthlyRooms: 30, operationType: 'hybrid' });
assert.equal(zeroLodgingHybrid.details.laundry, 0, '혼합형 숙박 0실 세탁비 0');
assert.equal(zeroLodgingHybrid.details.pmsCms, 0, '혼합형 숙박 0실 PMS/CMS 0');

const roiExample = metrics({ revenue: 7000000, expense: 0, investment: 800000000, rooms: 1 });
assert.equal(roiExample.annualProfit, 84000000);
assert.equal(roiExample.roi, 10.5);
assert.ok(Math.abs(roiExample.paybackYears - (800000000 / 84000000)) < 0.001);
assert.match(roiGuide, /연간 예상 영업이익 ÷ 총 투자금 × 100/);
assert.match(roiGuide, /예상 회수기간 = 총 투자금 ÷ 연간 예상 영업이익/);
assert.match(roiGuide, /총 투자금이 0원.*모두 계산 불가/s);
assert.match(roiGuide, /연간 예상 영업이익이 음수.*ROI는 음수.*회수기간은 산정 불가/s);
assert.doesNotMatch(roiGuide, /좋은 ROI 기준|적정 회수기간은|업계 평균 수익률/);

const scenarioResult = (input) => {
  const simpleResult = estimateSimple(input);
  return metrics({ revenue: simpleResult.revenue, expense: simpleResult.expense, fixed: simpleResult.fixed, variable: simpleResult.variable, investment: 700000000, rooms: input.rooms, details: simpleResult.details, lodgingRevenue: simpleResult.lodgingRevenue, monthlyStayRevenue: simpleResult.monthlyStayRevenue });
};
const lodgingScenario = scenarioResult({ operationType: 'lodging', rooms: 30, area: 1200, lodgingRevenuePerRoom: 1800000, deposit: 200000000, premium: 400000000, rent: 20000000 });
const hybridScenario = scenarioResult({ operationType: 'hybrid', rooms: 32, area: 1200, lodgingRooms: 20, monthlyRooms: 12, lodgingRevenuePerRoom: 1800000, monthlyStayRevenuePerRoom: 1000000, deposit: 200000000, premium: 400000000, rent: 20000000 });
const lodgingTwentyScenario = scenarioResult({ operationType: 'lodging', rooms: 20, area: 1200, lodgingRevenuePerRoom: 1800000, deposit: 200000000, premium: 400000000, rent: 20000000 });
const lodgingThirtyFiveScenario = scenarioResult({ operationType: 'lodging', rooms: 35, area: 1200, lodgingRevenuePerRoom: 1800000, deposit: 200000000, premium: 400000000, rent: 20000000 });
const monthlyThirtyScenario = scenarioResult({ operationType: 'monthly', rooms: 30, area: 1200, monthlyStayRevenuePerRoom: 1000000, deposit: 200000000, premium: 400000000, rent: 20000000 });
const htmlEngineValue = (html, key) => Number(html.match(new RegExp(`data-engine-key="${key.replace('.', '\\.')}" data-engine-value="([^"]+)"`))?.[1]);
const assertHtmlValues = (html, result, keys) => {
  for (const key of keys) {
    const expected = key.startsWith('details.') ? result.details[key.slice(8)] : result[key];
    assert.ok(Math.abs(htmlEngineValue(html, key) - expected) < 0.001, `사례 HTML 엔진 값 불일치: ${key}`);
  }
};
const coreScenarioKeys = ['revenue', 'expense', 'monthlyProfit', 'margin', 'annualProfit', 'investment', 'roi', 'paybackYears', 'details.rent', 'details.cleaningLabor', 'details.payrollBurden', 'details.electricity', 'details.water', 'details.gas', 'details.platform', 'details.laundry', 'details.pmsCms', 'details.communications', 'details.amenities', 'details.insurance', 'details.accounting'];
assertHtmlValues(lodgingExampleHtml, lodgingScenario, coreScenarioKeys);
assertHtmlValues(hybridExampleHtml, hybridScenario, ['lodgingRevenue', 'monthlyStayRevenue', ...coreScenarioKeys]);
assertHtmlValues(lodgingTwentyHtml, lodgingTwentyScenario, coreScenarioKeys);
assertHtmlValues(lodgingThirtyFiveHtml, lodgingThirtyFiveScenario, coreScenarioKeys);
assertHtmlValues(monthlyThirtyHtml, monthlyThirtyScenario, ['monthlyStayRevenue', ...coreScenarioKeys]);

const guideScenarios = new Map([
  ['lodging-20', lodgingTwentyScenario],
  ['lodging-30', lodgingScenario],
  ['lodging-35', lodgingThirtyFiveScenario],
  ['monthly-30', monthlyThirtyScenario],
  ['hybrid-32', hybridScenario]
]);
const scopedGuideValue = (attribute, scenarioId, key, tag) => {
  const scope = guideHub.match(new RegExp(`<${tag}[^>]*${attribute}="${scenarioId}"[\\s\\S]*?<\\/${tag}>`))?.[0];
  assert.ok(scope, `guide.html 사례 범위 누락: ${scenarioId}`);
  return htmlEngineValue(scope, key);
};
const cardKeys = ['revenue', 'expense', 'monthlyProfit', 'margin', 'roi', 'paybackYears'];
const comparisonKeys = [...cardKeys, 'annualProfit'];
for (const [scenarioId, result] of guideScenarios) {
  for (const key of cardKeys) {
    assert.ok(Math.abs(scopedGuideValue('data-card-scenario', scenarioId, key, 'article') - result[key]) < 0.001, `사례 카드 엔진 값 불일치: ${scenarioId} ${key}`);
  }
  for (const key of comparisonKeys) {
    assert.ok(Math.abs(scopedGuideValue('data-comparison-scenario', scenarioId, key, 'tr') - result[key]) < 0.001, `비교표 엔진 값 불일치: ${scenarioId} ${key}`);
  }
}
assert.equal((guideHub.match(/data-card-scenario=/g) || []).length, 5, 'guide.html 사례 카드는 정확히 5개여야 함');
assert.equal((guideHub.match(/data-comparison-scenario=/g) || []).length, 5, 'guide.html 비교표 행은 정확히 5개여야 함');
const guideExampleTargets = [...guideHub.matchAll(/href="(\/examples\/[^"#?]+\.html)"/g)].map((match) => match[1]);
assert.deepEqual([...new Set(guideExampleTargets)].sort(), exampleFiles.map((file) => `/examples/${file}`), 'guide.html은 정확히 기존 사례 5개만 연결해야 함');
assert.match(guideHub, /data-example-finder/);
assert.match(guideHub, /comparison-table-scroll/);
assert.match(guideHub, /href="https:\/\/staycalculators\.com\/"/, 'guide.html 계산기 CTA 누락');
assert.doesNotMatch(guideHub, /data-example-list[^>]*hidden/, 'JavaScript 비활성 시 사례 목록이 숨겨지면 안 됨');
assert.match(contentCss, /\.comparison-table-scroll\{[^}]*overflow-x:auto/);
assert.match(contentCss, /@media\(max-width:620px\)/, '320px 대응 모바일 미디어 쿼리 누락');
assert.match(lodgingExampleHtml, /계산 구조를 설명하기 위한 가상 시나리오/);
assert.match(hybridExampleHtml, /계산 구조를 설명하기 위한 가상 시나리오/);
assert.match(hybridExampleHtml, /숙박 매출 3,600만원 × 9%/);
assert.match(hybridExampleHtml, /숙박 20실 × \(400만원÷35실\)/);
assert.match(hybridExampleHtml, /숙박 객실 존재: 전체 32실 기준/);
assert.equal(lodgingThirtyFiveScenario.details.laundry, 4000000, '35실 사례 세탁비 기준점');
assert.equal(monthlyThirtyScenario.details.laundry, 0, '30실 달방 사례 세탁비 0');
assert.equal(monthlyThirtyScenario.details.pmsCms, 0, '30실 달방 사례 PMS/CMS 0');
assert.equal(monthlyThirtyScenario.details.platform, 0, '30실 달방 사례 플랫폼 비용 0');
assert.match(monthlyThirtyHtml, /간편 분석 기본 가정/);
for (const html of [lodgingExampleHtml, hybridExampleHtml, lodgingTwentyHtml, lodgingThirtyFiveHtml, monthlyThirtyHtml]) {
  assert.match(html, /가상 시나리오/);
  assert.doesNotMatch(html, /실제 사례|실거래 사례|추천 매물|수익을 보장/);
}

const assertRelatedExamples = (html, currentFile, expectedFiles) => {
  assert.doesNotMatch(html, new RegExp(`href="/examples/${currentFile.replaceAll('.', '\\.')}"`), `${currentFile}: 자기 자신 사례 링크 금지`);
  for (const file of expectedFiles) assert.match(html, new RegExp(`href="/examples/${file.replaceAll('.', '\\.')}"`), `${currentFile}: 관련 사례 링크 누락 ${file}`);
};
assertRelatedExamples(lodgingTwentyHtml, '20-room-lodging-example.html', ['30-room-lodging-example.html', '35-room-lodging-example.html']);
assertRelatedExamples(lodgingExampleHtml, '30-room-lodging-example.html', ['20-room-lodging-example.html', '35-room-lodging-example.html']);
assertRelatedExamples(lodgingThirtyFiveHtml, '35-room-lodging-example.html', ['20-room-lodging-example.html', '30-room-lodging-example.html']);
assertRelatedExamples(monthlyThirtyHtml, '30-room-monthly-stay-example.html', ['30-room-lodging-example.html', '32-room-hybrid-example.html']);
assertRelatedExamples(hybridExampleHtml, '32-room-hybrid-example.html', ['30-room-lodging-example.html', '30-room-monthly-stay-example.html']);

assert.match(rentGuide, /월매출이 월세를 넘는지만으로 수익성을 판단할 수 없습니다/);
assert.match(rentGuide, /월 영업이익 = 예상 월매출 − 전체 예상 월 운영비/);
for (const cost of ['청소 인건비', '전기·수도·가스', '플랫폼·결제 비용', '외주 린넨·세탁비', '어매니티·통신비', 'PMS/CMS', '보험료와 세무 기장료']) {
  assert.ok(rentGuide.includes(cost), `고월세 가이드 운영비 누락: ${cost}`);
}

for (const html of [revenuePerRoomGuide, laundryGuide, platformGuide, monthlyStayGuide, hybridGuide, roiGuide, rentGuide]) {
  assert.match(html, /계산 구조 설명을 위한 가상 예시/, '신규 가이드 가상 예시 표시 누락');
  assert.match(html, /https:\/\/staycalculators\.com\//, '신규 가이드 계산기 CTA 누락');
}

for (const html of [index, profitGuide, breakEvenGuide, laborGuide, revenuePerRoomGuide, laundryGuide, platformGuide, monthlyStayGuide, hybridGuide, roiGuide, rentGuide]) {
  assert.doesNotMatch(html, /모든 달방 시설의 세탁비는 0원|달방은 세탁비가 없다|달방은 침구가 필요 없다|모든 장기투숙 시설은 세탁비 0원/);
  assert.doesNotMatch(html, /실제 사례입니다|업계 평균입니다|표준 비용입니다|업계 평균으로/);
}

console.log('content tests: passed');
