import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { estimateSimple } from '../public/js/calculator.js';
import {
  buildSimpleAnalysisShareText,
  copyShareText,
  createSimpleAnalysisShareModel,
  downloadSimpleAnalysisImage,
  renderSimpleAnalysisPng,
  shareSimpleAnalysis,
  simpleAnalysisImageFilename
} from '../public/js/share.js';

const status = { key: 'good', text: '수익성 지표 양호' };
const baseState = {
  rooms: 32,
  area: 1200,
  deposit: 200000000,
  premium: 300000000,
  rent: 25000000,
  lodgingRevenuePerRoom: 2000000,
  monthlyStayRevenuePerRoom: 900000,
  lodgingRooms: 20,
  monthlyRooms: 12,
  operationType: 'lodging'
};

function modelFor(overrides = {}) {
  const state = { ...baseState, ...overrides };
  return createSimpleAnalysisShareModel(estimateSimple(state), state, status);
}

const lodgingModel = modelFor();
const lodgingText = buildSimpleAnalysisShareText(lodgingModel);
assert.match(lodgingText, /운영방식: 숙박형/);
assert.match(lodgingText, /숙박 객실: 32실/);
assert.match(lodgingText, /예상 월매출: 6,400만원/);
assert.match(lodgingText, /https:\/\/staycalculators\.com\//);

const monthlyText = buildSimpleAnalysisShareText(modelFor({ operationType: 'monthly' }));
assert.match(monthlyText, /운영방식: 달방형/);
assert.match(monthlyText, /달방 객실: 32실/);

const hybridModel = modelFor({ operationType: 'hybrid' });
const hybridText = buildSimpleAnalysisShareText(hybridModel);
assert.match(hybridText, /운영방식: 혼합형/);
assert.match(hybridText, /숙박 객실: 20실/);
assert.match(hybridText, /달방 객실: 12실/);
assert.match(hybridText, /숙박 예상 매출:/);
assert.match(hybridText, /달방 예상 매출:/);

const zeroText = buildSimpleAnalysisShareText(modelFor({ rooms: 0, deposit: 0, premium: 0, rent: 0, lodgingRevenuePerRoom: 0 }));
assert.match(zeroText, /예상 월매출: 0원/);
assert.match(zeroText, /영업이익률: 계산 불가/);

const lossText = buildSimpleAnalysisShareText(modelFor({ rooms: 1, rent: 10000000, lodgingRevenuePerRoom: 100000 }));
assert.match(lossText, /예상 월 영업손실:/);
assert.doesNotMatch(lossText, /예상 회수기간:/);

const invalidResult = {
  revenue: Number.NaN,
  expense: Number.POSITIVE_INFINITY,
  monthlyProfit: Number.NEGATIVE_INFINITY,
  margin: null,
  investment: undefined,
  annualProfit: Number.NaN,
  roi: Number.POSITIVE_INFINITY,
  paybackYears: null,
  lodgingRevenue: Number.NaN,
  monthlyStayRevenue: undefined
};
const invalidModel = createSimpleAnalysisShareModel(invalidResult, { ...baseState, operationType: 'hybrid' }, { key: 'warning', text: '주의' });
const invalidText = buildSimpleAnalysisShareText(invalidModel);
for (const unsafe of ['NaN', 'Infinity', 'undefined', 'null']) assert.doesNotMatch(invalidText, new RegExp(unsafe, 'i'));
assert.ok(invalidModel.primary.every((item) => item.value));
assert.equal(invalidModel.secondary.length, 0);

let sharedPayload;
assert.deepEqual(await shareSimpleAnalysis(lodgingModel, { navigatorRef: { share: async (payload) => { sharedPayload = payload; } } }), { status: 'shared' });
assert.equal(sharedPayload.url, 'https://staycalculators.com/');
assert.doesNotMatch(sharedPayload.text, /https:\/\/staycalculators\.com\//, 'Web Share text와 url 필드 URL 중복 방지');

const abortError = new Error('cancelled');
abortError.name = 'AbortError';
assert.deepEqual(await shareSimpleAnalysis(lodgingModel, { navigatorRef: { share: async () => { throw abortError; } } }), { status: 'cancelled' });

let clipboardText = '';
assert.deepEqual(await shareSimpleAnalysis(lodgingModel, { navigatorRef: { clipboard: { writeText: async (text) => { clipboardText = text; } } } }), { status: 'copied' });
assert.match(clipboardText, /https:\/\/staycalculators\.com\//);
assert.deepEqual(await shareSimpleAnalysis(lodgingModel, { navigatorRef: { share: async () => { throw new Error('share unavailable'); }, clipboard: { writeText: async () => {} } } }), { status: 'copied' });

let removed = false;
const textarea = { style: {}, setAttribute() {}, focus() {}, select() {}, remove() { removed = true; } };
const legacyDocument = { createElement: () => textarea, body: { append() {} }, execCommand: (command) => command === 'copy' };
assert.equal(await copyShareText('fallback', { navigatorRef: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, documentRef: legacyDocument }), true);
assert.equal(textarea.value, 'fallback');
assert.equal(removed, true);

assert.equal(simpleAnalysisImageFilename(new Date(2026, 6, 6)), 'staycalculators-simple-analysis-2026-07-06.png');
assert.equal(hybridModel.primary.length, 4);
assert.equal(hybridModel.operationLabel, '혼합형');
assert.equal(hybridModel.status.text, status.text);
assert.doesNotMatch(JSON.stringify(hybridModel), /undefined|NaN|Infinity/);

const drawingContext = {
  beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {}, fill() {}, fillRect() {}, fillText() {}, stroke() {},
  measureText: (text) => ({ width: String(text).length * 12 })
};
const canvas = { width: 0, height: 0, getContext: () => drawingContext, toBlob: (callback, type) => callback(new Blob(['png'], { type })) };
let downloadClicked = false;
const anchor = { href: '', download: '', click() { downloadClicked = true; }, remove() {} };
const canvasDocument = {
  fonts: { ready: Promise.resolve() },
  body: { append() {} },
  createElement: (tag) => tag === 'canvas' ? canvas : anchor
};
const renderedBlob = await renderSimpleAnalysisPng(hybridModel, { documentRef: canvasDocument });
assert.equal(canvas.width, 1080);
assert.equal(canvas.height, 1350);
assert.equal(renderedBlob.type, 'image/png');
let revokedUrl = '';
const urlRef = { createObjectURL: () => 'blob:test-image', revokeObjectURL: (url) => { revokedUrl = url; } };
const download = await downloadSimpleAnalysisImage(hybridModel, { documentRef: canvasDocument, urlRef, date: new Date(2026, 6, 6) });
assert.equal(download.filename, 'staycalculators-simple-analysis-2026-07-06.png');
assert.equal(anchor.href, 'blob:test-image');
assert.equal(downloadClicked, true);
assert.equal(revokedUrl, 'blob:test-image');

const indexHtml = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const calculatorCss = await readFile(new URL('../public/css/calculator.css', import.meta.url), 'utf8');
const responsiveCss = await readFile(new URL('../public/css/responsive.css', import.meta.url), 'utf8');
assert.match(indexHtml, /id="share-simple-result"[^>]+aria-label="간편 분석 결과 공유하기"/);
assert.match(indexHtml, /id="save-simple-image"[^>]+aria-label="간편 분석 결과 이미지 저장"/);
assert.match(indexHtml, /id="simple-share-feedback"[^>]+aria-live="polite"/);
assert.match(calculatorCss, /\.simple-share-actions/);
assert.match(responsiveCss, /max-width:420px[^}]+\.simple-share-actions\{grid-template-columns:1fr\}/);

console.log('share tests: passed');
