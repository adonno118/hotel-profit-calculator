import assert from 'node:assert/strict';
import { estimateSimple, calculateDetailed, compareScenarios, metrics } from '../js/calculator.js';
import { number } from '../js/utils.js';

const simple = estimateSimple({ rooms: 32, area: 1200, deposit: 200000000, premium: 300000000, rent: 25000000, revenuePerRoom: 2000000, employees: 3, salaryPerEmployee: 3000000, operationType: 'lodging' });
assert.equal(simple.revenue, 64000000, '객실 수 × 객실당 매출');
assert.equal(simple.investment, 500000000, '보증금 + 권리금');
assert.equal(simple.details.payroll, 9000000, '직원 수 × 1인당 월급');
assert.equal(simple.details.payrollBurden, 945000, '급여 × 사업주 부담률');
assert.equal(simple.details.electricity, 2100000, '연면적 × 전기요금 계수');
assert.equal(simple.details.platform, 5760000, '매출 × 플랫폼 비용률');
assert.equal(simple.monthlyProfit, simple.revenue - simple.expense, '영업이익 공식');
assert.equal(simple.annualProfit, simple.monthlyProfit * 12, '연 영업이익 공식');

const detailed = calculateDetailed({
  rooms: 20,
  investments: [{ amount: 100000000 }, { amount: 50000000 }],
  revenues: [{ amount: 40000000 }, { amount: 10000000 }],
  expenses: [{ category: 'fixed', method: 'amount', amount: 20000000 }, { category: 'variable', method: 'rate', rate: 10 }]
});
assert.equal(detailed.revenue, 50000000);
assert.equal(detailed.fixed, 20000000);
assert.equal(detailed.variable, 5000000);
assert.equal(detailed.monthlyProfit, 25000000);
assert.equal(detailed.margin, 50);
assert.equal(detailed.monthlyPerHundredM, 25000000 / 150000000 * 100000000);

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
const boundedRate = calculateDetailed({ rooms: 1, investments: [], revenues: [{ amount: 1000 }], expenses: [{ category: 'variable', method: 'rate', rate: 150 }] });
assert.equal(boundedRate.expense, 1000, '비율 비용은 100%로 제한');

const scenarios = compareScenarios({ ...{
  rooms: 30, hybrid: { lodgingRooms: 20, monthlyRooms: 10 }, investments: [{ amount: 100000000 }],
  revenues: [{ amount: 60000000 }], expenses: [{ category: 'fixed', method: 'amount', amount: 20000000 }, { category: 'variable', method: 'amount', amount: 10000000 }]
} });
assert.equal(scenarios.length, 3);
assert.ok(scenarios.every((item) => Number.isFinite(item.monthlyProfit)));
const hybrid = scenarios.find((item) => item.key === 'hybrid');
assert.equal(hybrid.revenue, 56400000, '숙박·달방 객실 비중에 따른 하이브리드 매출');
assert.equal(hybrid.expense, 28500000, '고정비 + 객실 비중을 반영한 변동비');

console.log('calculator tests: passed');
