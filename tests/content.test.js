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
