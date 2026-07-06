import { validateHybridRoomAllocation } from './calculator.js';
import { SITE_CONFIG } from './config/site-config.js';
import { compactWon, number, percent, years } from './utils.js';

export const SIMPLE_SHARE_TITLE = '숙박업 수익성 간편 분석';
export const SIMPLE_SHARE_URL = `${SITE_CONFIG.siteUrl}/`;
export const SIMPLE_SHARE_DISCLAIMER = '입력값과 참고 추정치에 따른 단순 분석 결과이며 실제 수익을 보장하지 않습니다.';

const OPERATION_LABELS = { lodging: '숙박형', monthly: '달방형', hybrid: '혼합형' };
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const moneyValue = (value) => isFiniteNumber(value) ? compactWon(value) : null;
const percentValue = (value) => isFiniteNumber(value) ? percent(value) : null;
const yearsValue = (value) => isFiniteNumber(value) && value > 0 ? years(value) : null;

export function createSimpleAnalysisShareModel(result, simpleState, status) {
  const operationType = OPERATION_LABELS[simpleState?.operationType] ? simpleState.operationType : 'lodging';
  const totalRooms = number(simpleState?.rooms);
  const allocation = validateHybridRoomAllocation(totalRooms, simpleState?.lodgingRooms, simpleState?.monthlyRooms);
  const roomLines = operationType === 'hybrid'
    ? [
        { label: '숙박 객실', value: `${allocation.lodgingRooms}실` },
        { label: '달방 객실', value: `${allocation.monthlyRooms}실` }
      ]
    : [{ label: operationType === 'monthly' ? '달방 객실' : '숙박 객실', value: `${totalRooms}실` }];
  const monthlyProfitLabel = isFiniteNumber(result?.monthlyProfit) && result.monthlyProfit < 0 ? '예상 월 영업손실' : '예상 월 영업이익';
  const annualProfitLabel = isFiniteNumber(result?.annualProfit) && result.annualProfit < 0 ? '연간 예상 영업손실' : '연간 예상 영업이익';
  const primary = [
    { label: '예상 월매출', value: moneyValue(result?.revenue) },
    { label: '예상 월 운영비', value: moneyValue(result?.expense) },
    { label: monthlyProfitLabel, value: moneyValue(result?.monthlyProfit), tone: result?.monthlyProfit < 0 ? 'loss' : 'profit' },
    { label: '영업이익률', value: percentValue(result?.margin) }
  ].map((item) => ({ ...item, value: item.value ?? '계산 불가' }));
  const secondary = [
    { label: '총 투자금', value: moneyValue(result?.investment) },
    { label: annualProfitLabel, value: moneyValue(result?.annualProfit) },
    { label: '투자금 대비 연 수익률', value: percentValue(result?.roi) },
    { label: '예상 회수기간', value: yearsValue(result?.paybackYears) }
  ].filter((item) => item.value !== null);
  const revenueComposition = operationType === 'hybrid'
    ? [
        { label: '숙박 예상 매출', value: moneyValue(result?.lodgingRevenue) },
        { label: '달방 예상 매출', value: moneyValue(result?.monthlyStayRevenue) }
      ].filter((item) => item.value !== null)
    : [];

  return {
    title: SIMPLE_SHARE_TITLE,
    operationLabel: OPERATION_LABELS[operationType],
    roomLines,
    primary,
    secondary,
    revenueComposition,
    status: status?.text ? { key: status.key === 'good' ? 'good' : 'warning', text: status.text } : null,
    url: SIMPLE_SHARE_URL,
    displayUrl: 'staycalculators.com',
    disclaimer: SIMPLE_SHARE_DISCLAIMER
  };
}

export function buildSimpleAnalysisShareText(model, { includeUrl = true } = {}) {
  const lines = [model.title, '', `운영방식: ${model.operationLabel}`];
  model.roomLines.forEach((item) => lines.push(`${item.label}: ${item.value}`));
  lines.push('');
  model.primary.forEach((item) => lines.push(`${item.label}: ${item.value}`));
  if (model.revenueComposition.length) {
    lines.push('');
    model.revenueComposition.forEach((item) => lines.push(`${item.label}: ${item.value}`));
  }
  if (model.secondary.length) {
    lines.push('');
    model.secondary.forEach((item) => lines.push(`${item.label}: ${item.value}`));
  }
  if (includeUrl) lines.push('', '직접 계산해보기', model.url);
  lines.push('', `※ ${model.disclaimer}`);
  return lines.join('\n');
}

export async function copyShareText(text, { navigatorRef = globalThis.navigator, documentRef = globalThis.document } = {}) {
  try {
    if (navigatorRef?.clipboard?.writeText) {
      await navigatorRef.clipboard.writeText(text);
      return true;
    }
  } catch {}
  if (!documentRef?.createElement || !documentRef?.body || typeof documentRef.execCommand !== 'function') return false;
  const textarea = documentRef.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  documentRef.body.append(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try { copied = documentRef.execCommand('copy'); } catch {}
  textarea.remove();
  return copied;
}

export async function shareSimpleAnalysis(model, dependencies = {}) {
  const navigatorRef = dependencies.navigatorRef ?? globalThis.navigator;
  const text = buildSimpleAnalysisShareText(model, { includeUrl: false });
  if (typeof navigatorRef?.share === 'function') {
    try {
      await navigatorRef.share({ title: model.title, text, url: model.url });
      return { status: 'shared' };
    } catch (error) {
      if (error?.name === 'AbortError') return { status: 'cancelled' };
    }
  }
  const copied = await copyShareText(buildSimpleAnalysisShareText(model), { ...dependencies, navigatorRef });
  return { status: copied ? 'copied' : 'failed' };
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, color) {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function fittedText(context, text, x, y, maxWidth, startSize, color, weight = 800) {
  let size = startSize;
  while (size > 18) {
    context.font = `${weight} ${size}px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    if (context.measureText(text).width <= maxWidth || size <= 20) break;
    size -= 2;
  }
  context.fillStyle = color;
  context.fillText(text, x, y);
}

function metricCard(context, item, x, y, width, height, primary = false) {
  const background = item.tone === 'loss' ? '#fff0ef' : item.tone === 'profit' ? '#e9f5f1' : primary ? '#eef4f7' : '#f7fafb';
  fillRoundedRect(context, x, y, width, height, 22, background);
  context.fillStyle = '#41545f';
  context.font = '700 27px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText(item.label, x + 30, y + 42);
  fittedText(context, item.value, x + 30, y + height - 34, width - 60, primary ? 46 : 38, item.tone === 'loss' ? '#a53b36' : '#173f5f');
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
}

export async function renderSimpleAnalysisPng(model, { documentRef = globalThis.document } = {}) {
  if (!documentRef?.createElement) throw new Error('이미지를 생성할 수 없는 환경입니다.');
  if (documentRef.fonts?.ready) await documentRef.fonts.ready;
  const canvas = documentRef.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지 캔버스를 생성하지 못했습니다.');

  context.fillStyle = '#edf3f5';
  context.fillRect(0, 0, canvas.width, canvas.height);
  fillRoundedRect(context, 54, 54, 972, 1242, 34, '#ffffff');
  fillRoundedRect(context, 54, 54, 972, 220, 34, '#173f5f');
  context.fillStyle = '#ffffff';
  context.font = '800 52px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText(model.title, 102, 142);
  context.fillStyle = '#d9e7ef';
  context.font = '600 25px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText(model.displayUrl, 104, 197);

  const statusColor = model.status?.key === 'good' ? '#dcefe7' : '#fff1c9';
  const statusTextColor = model.status?.key === 'good' ? '#175c45' : '#73510d';
  fillRoundedRect(context, 720, 180, 254, 56, 28, statusColor);
  context.fillStyle = statusTextColor;
  context.textAlign = 'center';
  fittedText(context, model.status?.text || '간편 분석 결과', 847, 216, 220, 23, statusTextColor);
  context.textAlign = 'left';

  context.fillStyle = '#53636e';
  context.font = '700 26px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText('운영방식', 104, 332);
  context.fillStyle = '#17242d';
  context.font = '800 38px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText(model.operationLabel, 104, 379);
  let roomX = 360;
  model.roomLines.forEach((item) => {
    context.fillStyle = '#53636e';
    context.font = '700 24px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    context.fillText(item.label, roomX, 332);
    context.fillStyle = '#17242d';
    context.font = '800 34px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    context.fillText(item.value, roomX, 379);
    roomX += 260;
  });

  const columnWidth = 420;
  model.primary.forEach((item, index) => metricCard(context, item, 104 + (index % 2) * 448, 425 + Math.floor(index / 2) * 150, columnWidth, 126, true));

  context.fillStyle = '#173f5f';
  context.font = '800 30px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText('투자 수익성 요약', 104, 774);
  model.secondary.slice(0, 4).forEach((item, index) => metricCard(context, item, 104 + (index % 2) * 448, 802 + Math.floor(index / 2) * 122, columnWidth, 102));

  if (model.revenueComposition.length) {
    context.fillStyle = '#53636e';
    context.font = '700 23px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    context.fillText('매출 구성', 104, 1067);
    model.revenueComposition.forEach((item, index) => {
      const compositionX = 258 + index * 356;
      context.fillStyle = '#334852';
      fittedText(context, `${item.label} ${item.value}`, compositionX, 1067, 330, 23, '#334852', 700);
    });
  }

  context.strokeStyle = '#d5dee4';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(104, 1120);
  context.lineTo(976, 1120);
  context.stroke();
  context.fillStyle = '#53636e';
  context.font = '600 23px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  wrapText(context, model.disclaimer, 104, 1173, 872, 34, 2);
  context.fillStyle = '#173f5f';
  context.font = '800 28px Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  context.fillText(model.displayUrl, 104, 1252);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 생성에 실패했습니다.')), 'image/png'));
}

export function simpleAnalysisImageFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `staycalculators-simple-analysis-${year}-${month}-${day}.png`;
}

export async function downloadSimpleAnalysisImage(model, { documentRef = globalThis.document, urlRef = globalThis.URL, date = new Date() } = {}) {
  const blob = await renderSimpleAnalysisPng(model, { documentRef });
  const objectUrl = urlRef.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = objectUrl;
  anchor.download = simpleAnalysisImageFilename(date);
  documentRef.body.append(anchor);
  anchor.click();
  anchor.remove();
  urlRef.revokeObjectURL(objectUrl);
  return { blob, filename: anchor.download };
}
