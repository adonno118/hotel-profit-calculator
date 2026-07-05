import assert from 'node:assert/strict';
import {
  calculateDetailed,
  compareScenarios,
  estimateAmenityCost,
  estimateCommunicationCost,
  estimateHybridCleaningCost,
  estimateLaundryCost,
  estimateLodgingCleaningCost,
  estimateMonthlyStayCleaningCost,
  estimatePlatformCost,
  estimatePmsCmsCost,
  estimateSimple,
  metrics,
  validateHybridRoomAllocation
} from '../public/js/calculator.js';
import { fromWon, number, toWon } from '../public/js/utils.js';
import { LODGING_REVENUE_PRESETS, MONTHLY_STAY_REVENUE_PRESETS } from '../public/js/config/estimation-config.js';

assert.deepEqual(LODGING_REVENUE_PRESETS, [800000, 1000000, 1200000, 1500000, 1800000, 2000000, 2500000]);
assert.deepEqual(MONTHLY_STAY_REVENUE_PRESETS, [500000, 600000, 700000, 800000, 1000000, 1200000]);

const simple = estimateSimple({ rooms: 32, area: 1200, deposit: 200000000, premium: 300000000, rent: 25000000, lodgingRevenuePerRoom: 2000000, monthlyStayRevenuePerRoom: 900000, operationType: 'lodging' });
assert.equal(simple.revenue, 64000000, '객실 수 × 객실당 매출');
assert.equal(simple.investment, 500000000, '보증금 + 권리금');
assert.equal(simple.details.cleaningLabor, 8000000, '32객실 숙박 청소 인건비');
assert.equal(simple.details.payrollBurden, 800000, '숙박 청소 인건비 × 10%');
assert.equal(simple.details.electricity, 2100000, '연면적 × 전기요금 계수');
assert.equal(simple.details.platform, 5760000, '숙박 매출 × 플랫폼 비용률');
assert.equal(simple.details.communications, 480000, '객실 수 × 통신비 계수');
assert.equal(simple.details.amenities, 1600000, '객실 수 × 어매니티 계수');
assert.ok(Math.abs(simple.details.laundry - 3657142.8571428573) < 0.001, '35객실 400만원 기준 세탁비 비례 환산');
assert.equal(simple.details.insurance, 50000);
assert.equal(simple.details.accounting, 100000);
assert.equal(simple.monthlyProfit, simple.revenue - simple.expense, '영업이익 공식');
assert.equal(simple.annualProfit, simple.monthlyProfit * 12, '연 영업이익 공식');
for (const removed of ['maintenance', 'supplies', 'other']) assert.equal(removed in simple.details, false, `${removed} 자동 비용 제거`);

const monthlySimple = estimateSimple({ rooms: 20, area: 0, rent: 0, lodgingRevenuePerRoom: 1800000, monthlyStayRevenuePerRoom: 1000000, operationType: 'monthly' });
assert.equal(monthlySimple.lodgingRevenue, 0, '달방 전용 숙박 매출 0');
assert.equal(monthlySimple.details.platform, 0, '테스트 A: 달방 전용 플랫폼 비용 0');
assert.equal(monthlySimple.details.payrollBurden, 4500, '달방 청소 인건비 × 0.9%');
assert.equal(monthlySimple.details.laundry, 0, '테스트 A: 달방 외부 세탁비 0');
assert.equal(monthlySimple.details.pmsCms, 0, '테스트 A: 달방 PMS/CMS 0');

assert.equal(estimatePlatformCost(30000000, 0.1), 3000000, '테스트 B: 숙박 3천만원 × 10%');
assert.equal(estimateLodgingCleaningCost(15), 3500000, '테스트 C');
assert.equal(estimateLodgingCleaningCost(20), 4500000, '테스트 D');
assert.equal(estimateLodgingCleaningCost(29), 6500000, '테스트 E');
assert.equal(estimateLodgingCleaningCost(30), 7000000, '테스트 F');
for (const [rooms, expected] of [[1, 1000000], [5, 1000000], [6, 2000000], [10, 2000000], [11, 3000000], [14, 3000000], [16, 4500000], [25, 5500000], [26, 6500000], [31, 8000000], [35, 8000000], [45, 10500000]]) {
  assert.equal(estimateLodgingCleaningCost(rooms), expected, `숙박 청소비 ${rooms}객실`);
}
assert.equal(estimateMonthlyStayCleaningCost(20), 500000, '테스트 G');
assert.equal(estimateMonthlyStayCleaningCost(21), 1000000, '테스트 H');
assert.equal(estimateHybridCleaningCost(20), 3500000, '테스트 I');
assert.equal(estimateHybridCleaningCost(29), 3500000, '테스트 J');
assert.equal(estimateHybridCleaningCost(30), 7000000, '테스트 K');
assert.equal(estimateCommunicationCost(32), 480000, '테스트 L');
assert.equal(estimateAmenityCost(32), 1600000, '테스트 M');
assert.equal(estimateLaundryCost(35), 4000000, '테스트 N');
assert.equal(estimatePmsCmsCost(10), 130000, '테스트 O');
assert.equal(estimatePmsCmsCost(32), 390000, '테스트 P');
assert.equal(toWon(0.5, 100000000), 50000000, '테스트 Q');
assert.equal(toWon(25, 1000000), 25000000, '테스트 R');
assert.equal(fromWon(500000000, 100000000), 5, '기존 원 단위 보증금 UI 변환');

const hybridSimple = estimateSimple({ rooms: 30, lodgingRooms: 20, monthlyRooms: 10, area: 0, rent: 0, lodgingRevenuePerRoom: 1800000, monthlyStayRevenuePerRoom: 900000, operationType: 'hybrid' });
assert.equal(hybridSimple.lodgingRevenue, 36000000, '하이브리드 테스트 A: 숙박 매출');
assert.equal(hybridSimple.monthlyStayRevenue, 9000000, '하이브리드 테스트 A: 달방 매출');
assert.equal(hybridSimple.revenue, 45000000, '하이브리드 테스트 A: 총매출');
assert.equal(hybridSimple.details.platform, 3240000, '기본 9%도 숙박 매출에만 적용');
assert.equal(estimatePlatformCost(hybridSimple.lodgingRevenue, 0.1), 3600000, '하이브리드 테스트 B: 플랫폼 비용');
assert.equal(hybridSimple.details.cleaningLabor, 3500000);
assert.equal(hybridSimple.details.payrollBurden, 350000, '혼합형 청소 인건비 × 10%');

const monthlyOnly = estimateSimple({ rooms: 30, lodgingRevenuePerRoom: 1800000, monthlyStayRevenuePerRoom: 900000, operationType: 'monthly' });
assert.equal(monthlyOnly.monthlyStayRevenue, 27000000, '하이브리드 테스트 C: 달방 전용 매출');
assert.equal(monthlyOnly.lodgingRevenue, 0);
assert.equal(monthlyOnly.details.platform, 0);

const lodgingOnly = estimateSimple({ rooms: 30, lodgingRevenuePerRoom: 1800000, monthlyStayRevenuePerRoom: 900000, operationType: 'lodging' });
assert.equal(lodgingOnly.lodgingRevenue, 54000000, '하이브리드 테스트 D: 숙박 전용 매출');
assert.equal(lodgingOnly.monthlyStayRevenue, 0);

const invalidAllocation = validateHybridRoomAllocation(30, 31, 0);
assert.equal(invalidAllocation.exceedsTotal, true, '하이브리드 테스트 E: 초과 객실 검증');
const safeInvalidResult = estimateSimple({ rooms: 30, lodgingRooms: 31, monthlyRooms: 0, lodgingRevenuePerRoom: 1800000, monthlyStayRevenuePerRoom: 900000, operationType: 'hybrid' });
assert.equal(safeInvalidResult.lodgingRevenue, 54000000, '초과 객실을 총 객실 범위로 제한');
assert.ok(Number.isFinite(safeInvalidResult.monthlyProfit), '초과 입력에도 계산 결과가 깨지지 않음');
assert.deepEqual(validateHybridRoomAllocation(0, '', Number.NaN), { totalRooms: 0, requestedLodging: 0, requestedMonthly: 0, lodgingRooms: 0, monthlyRooms: 0, exceedsTotal: false }, '0·빈 값·NaN 안전 처리');
assert.equal(validateHybridRoomAllocation(30, -5, -10).lodgingRooms, 0, '음수 객실 수 금지');

const detailed = calculateDetailed({
  rooms: 20,
  investments: [{ amount: 100000000 }, { amount: 50000000 }],
  revenues: [{ amount: 30000000, type: 'lodging' }, { amount: 20000000, type: 'monthly' }],
  expenses: [
    { name: '월세', category: 'fixed', method: 'amount', amount: 20000000 },
    { name: '플랫폼 수수료', basis: 'lodgingRevenue', category: 'variable', method: 'rate', rate: 10 }
  ]
});
assert.equal(detailed.revenue, 50000000);
assert.equal(detailed.lodgingRevenue, 30000000);
assert.equal(detailed.fixed, 20000000);
assert.equal(detailed.variable, 3000000, '상세 분석도 숙박 매출에만 플랫폼 비율 적용');
assert.equal(detailed.monthlyProfit, 27000000);
assert.equal(detailed.margin, 54);

const monthlyDetailed = calculateDetailed({ rooms: 20, investments: [], revenues: [{ amount: 20000000, type: 'monthly' }], expenses: [{ name: '플랫폼 비용', basis: 'lodgingRevenue', category: 'variable', method: 'amount', amount: 3000000 }] });
assert.equal(monthlyDetailed.variable, 0, '달방 매출만 있으면 직접 입력 플랫폼 비용도 0');

const zero = metrics({ revenue: 0, expense: 100, investment: 0, rooms: 0 });
assert.equal(zero.margin, null, '매출 0 나눗셈 방지');
assert.equal(zero.paybackYears, null, '투자비 0 회수기간 방지');
assert.equal(zero.revenuePerRoom, null, '객실 0 나눗셈 방지');

const loss = metrics({ revenue: 100, expense: 200, investment: 1000, rooms: 1 });
assert.equal(loss.monthlyProfit, -100);
assert.equal(loss.paybackYears, null, '영업손실 회수기간 방지');
assert.equal(number(''), 0, '빈 값은 0');
assert.equal(number('not-a-number'), 0, 'NaN 입력은 0');
assert.equal(number(-100), 0, '음수 입력은 0으로 제한');
const boundedRate = calculateDetailed({ rooms: 1, investments: [], revenues: [{ amount: 1000, type: 'lodging' }], expenses: [{ category: 'variable', method: 'rate', rate: 150 }] });
assert.equal(boundedRate.expense, 1000, '비율 비용은 100%로 제한');

const scenarioInput = {
  rooms: 30,
  hybrid: { lodgingRooms: 20, monthlyRooms: 10 },
  investments: [{ amount: 100000000 }],
  revenues: [{ amount: 30000000, type: 'lodging' }, { amount: 30000000, type: 'monthly' }],
  expenses: [
    { name: '월세', category: 'fixed', method: 'amount', amount: 20000000 },
    { name: '플랫폼 수수료', basis: 'lodgingRevenue', category: 'variable', method: 'rate', rate: 10 },
    { name: '세탁비', category: 'variable', method: 'amount', amount: 7000000 }
  ]
};
const scenarios = compareScenarios(scenarioInput);
assert.equal(scenarios.length, 3);
assert.equal(scenarios.find((item) => item.key === 'monthly').lodgingRevenue, 0);
assert.ok(scenarios.every((item) => Number.isFinite(item.monthlyProfit)));

console.log('calculator tests: passed');
