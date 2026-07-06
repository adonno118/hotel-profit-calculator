import assert from 'node:assert/strict';
import { getProfitMarginStatus } from '../public/js/ui.js';
import { compactWon, formatWonToBaekmanwon, formatWonToEokwon, formatWonToManwon, percent, years } from '../public/js/utils.js';
import { getRecommendedExampleId } from '../public/js/guide-examples.js';

assert.equal(formatWonToBaekmanwon(54400000), '54.4백만원');
assert.equal(formatWonToBaekmanwon(48088143), '48.1백만원');
assert.equal(formatWonToManwon(75742286), '7,574.2만원');
assert.equal(formatWonToEokwon(500000000), '5.0억원');
assert.equal(compactWon(54400000), '5,440만원');
assert.equal(percent(11.64), '11.6%');
assert.equal(years(6.64), '6.6년');

assert.deepEqual(getProfitMarginStatus(20), { key: 'good', text: '수익성 지표 양호' });
assert.deepEqual(getProfitMarginStatus(35.4), { key: 'good', text: '수익성 지표 양호' });
assert.deepEqual(getProfitMarginStatus(19.9), { key: 'warning', text: '주의: 영업이익률 20% 미만' });
assert.deepEqual(getProfitMarginStatus(null), { key: 'warning', text: '주의: 영업이익률 20% 미만' });

assert.equal(getRecommendedExampleId('lodging', 'around20'), 'example-20-lodging');
assert.equal(getRecommendedExampleId('lodging', 'around30'), 'example-30-lodging');
assert.equal(getRecommendedExampleId('lodging', 'over35'), 'example-35-lodging');
assert.equal(getRecommendedExampleId('monthly', 'around20'), 'example-30-monthly');
assert.equal(getRecommendedExampleId('hybrid', 'over35'), 'example-32-hybrid');
assert.equal(getRecommendedExampleId('unknown', 'around30'), null);

console.log('ui tests: passed');
