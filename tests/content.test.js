import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  estimateHybridCleaningCost,
  estimateLodgingCleaningCost,
  estimateMonthlyStayCleaningCost,
  estimateSimple
} from '../public/js/calculator.js';

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const index = await readFile(join(publicRoot, 'index.html'), 'utf8');
const profitGuide = await readFile(join(publicRoot, 'guide', 'hotel-profit-calculation.html'), 'utf8');
const breakEvenGuide = await readFile(join(publicRoot, 'guide', 'motel-break-even-point.html'), 'utf8');
const laborGuide = await readFile(join(publicRoot, 'guide', 'motel-labor-cost.html'), 'utf8');

const guideFiles = (await readdir(join(publicRoot, 'guide'))).filter((file) => file.endsWith('.html')).sort();
assert.deepEqual(guideFiles, [
  'hotel-profit-calculation.html',
  'motel-break-even-point.html',
  'motel-labor-cost.html'
], '1차 작업 신규 가이드 파일은 정확히 3개여야 함');

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

for (const html of [index, profitGuide, breakEvenGuide, laborGuide]) {
  assert.doesNotMatch(html, /모든 달방 시설의 세탁비는 0원|달방은 세탁비가 없다/);
  assert.doesNotMatch(html, /실제 사례입니다|업계 평균입니다|표준 비용입니다/);
}

console.log('content tests: passed');
