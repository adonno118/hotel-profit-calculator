import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG } from '../public/js/config/site-config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const siteUrl = 'https://staycalculators.com';
const placeholderUrlPattern = /(?:ex(?:ample|maple)\.com|your[-_.]?(?:domain|site|url))/i;
const corePages = ['index.html', 'about.html', 'guide.html', 'privacy.html', 'disclaimer.html', 'contact.html'];
const guidePages = [
  'guide/hotel-profit-calculation.html',
  'guide/hybrid-operation-profit.html',
  'guide/lodging-platform-fee.html',
  'guide/motel-break-even-point.html',
  'guide/motel-labor-cost.html',
  'guide/motel-laundry-cost.html',
  'guide/motel-rent-affordability.html',
  'guide/motel-revenue-per-room.html',
  'guide/motel-roi-payback.html',
  'guide/monthly-stay-profit.html'
];
const examplePages = [
  'examples/30-room-lodging-example.html',
  'examples/32-room-hybrid-example.html'
];
const contentPages = [...guidePages, ...examplePages];
const pages = [...corePages, ...contentPages];
const expectedUrls = new Map([
  ['index.html', `${siteUrl}/`],
  ...corePages.slice(1).map((page) => [page, `${siteUrl}/${page.replace(/\.html$/, '')}`]),
  ...contentPages.map((page) => [page, `${siteUrl}/${page}`])
]);
const canonicalUrls = [];
const titles = new Set();
const descriptions = new Set();

assert.equal(SITE_CONFIG.siteUrl, siteUrl, '중앙 사이트 URL 설정 불일치');
for (const page of corePages) {
  const url = expectedUrls.get(page);
  const route = new URL(url).pathname;
  assert.ok(SITE_CONFIG.pages[route], `중앙 페이지 설정 누락: ${route}`);
}

for (const page of pages) {
  const html = await readFile(join(root, page), 'utf8');
  assert.match(html, /<html\s+lang="ko"/i, `${page}: lang 누락`);
  assert.match(html, /<meta\s+name="viewport"/i, `${page}: viewport 누락`);
  assert.match(html, /<title>[^<]+<\/title>/i, `${page}: title 누락`);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${page}: description 누락`);
  assert.match(html, /<meta\s+name="robots"\s+content="index,follow,max-image-preview:large"/i, `${page}: robots 메타 누락`);
  assert.match(html, /<meta\s+property="og:locale"\s+content="ko_KR"/i, `${page}: og:locale 누락`);
  assert.match(html, /<meta\s+property="og:site_name"\s+content="숙박업 수익률 계산기"/i, `${page}: og:site_name 누락`);
  assert.match(html, /<meta\s+name="twitter:card"/i, `${page}: Twitter 카드 누락`);
  assert.match(html, /<link\s+rel="icon"/i, `${page}: favicon 누락`);
  assert.match(html, /<h1[\s>]/i, `${page}: h1 누락`);
  assert.equal((html.match(/<head>/gi) || []).length, 1, `${page}: head 시작 태그 불일치`);
  assert.equal((html.match(/<\/head>/gi) || []).length, 1, `${page}: head 종료 태그 불일치`);
  assert.equal((html.match(/<body[\s>]/gi) || []).length, 1, `${page}: body 시작 태그 불일치`);
  assert.equal((html.match(/<\/body>/gi) || []).length, 1, `${page}: body 종료 태그 불일치`);
  assert.doesNotMatch(html, placeholderUrlPattern, `${page}: placeholder URL 존재`);
  assert.doesNotMatch(html, /workers\.dev/i, `${page}: workers.dev URL 잔존`);

  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
  assert.equal(canonical, expectedUrls.get(page), `${page}: canonical URL 불일치`);
  assert.equal(ogUrl, expectedUrls.get(page), `${page}: og:url 불일치`);
  assert.ok(!titles.has(title), `${page}: title 중복`);
  assert.ok(!descriptions.has(description), `${page}: description 중복`);
  titles.add(title);
  descriptions.add(description);
  canonicalUrls.push(canonical);

  const structuredData = [...html.matchAll(/<script(?:\s+id="[^"]+")?\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
  assert.ok(structuredData.length > 0, `${page}: structured data 누락`);
  const structuredNodes = structuredData.flatMap((item) => item['@graph'] || [item]);
  assert.ok(
    structuredNodes.some((item) => item['@type'] === 'WebPage' && item.url === expectedUrls.get(page)),
    `${page}: WebPage structured data URL 불일치`
  );

  if (contentPages.includes(page)) {
    const breadcrumb = structuredNodes.find((item) => item['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumb, `${page}: BreadcrumbList 누락`);
    assert.deepEqual(
      breadcrumb.itemListElement.map((item) => item.position),
      [1, 2, 3],
      `${page}: Breadcrumb 순서 불일치`
    );
    assert.equal(breadcrumb.itemListElement[0].item, `${siteUrl}/`, `${page}: 홈 Breadcrumb URL 불일치`);
    assert.equal(breadcrumb.itemListElement[1].item, `${siteUrl}/guide`, `${page}: 가이드 Breadcrumb URL 불일치`);
    assert.equal(breadcrumb.itemListElement[2].item, expectedUrls.get(page), `${page}: 현재 페이지 Breadcrumb URL 불일치`);
    assert.match(html, /<nav\s+class="breadcrumb"\s+aria-label="현재 위치">/i, `${page}: 보이는 Breadcrumb 누락`);
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    const publicPath = reference === '/'
      ? 'index.html'
      : reference.startsWith('/') && !reference.split('/').at(-1).includes('.')
        ? `${reference.slice(1)}.html`
        : reference.replace(/^\//, '');
    const filePath = reference.startsWith('/') ? join(root, publicPath) : join(dirname(join(root, page)), publicPath);
    await access(filePath);
  }
}

const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
for (const url of canonicalUrls) assert.ok(sitemap.includes(`<loc>${url}</loc>`), `사이트맵 누락: ${url}`);
assert.equal((sitemap.match(/<url>/g) || []).length, pages.length, '사이트맵 URL 수 불일치');
assert.doesNotMatch(sitemap, placeholderUrlPattern, '사이트맵 placeholder URL 존재');
assert.doesNotMatch(sitemap, /workers\.dev/i, '사이트맵 workers.dev URL 잔존');
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(new Set(sitemapLocations).size, sitemapLocations.length, '사이트맵 중복 URL 존재');

const robots = await readFile(join(root, 'robots.txt'), 'utf8');
assert.match(robots, /User-agent:\s*\*/i);
assert.match(robots, /Allow:\s*\//i);
assert.match(robots, new RegExp(`Sitemap:\\s*${siteUrl.replaceAll('.', '\\.')}\\/sitemap\\.xml`, 'i'));

const adsText = await readFile(join(root, 'ads.txt'), 'utf8');
assert.equal(adsText.trim(), 'google.com, pub-6886067012627803, DIRECT, f08c47fec0942fa0', 'ads.txt 판매자 항목 불일치');
assert.equal(adsText.trim().split(/\r?\n/).length, 1, 'ads.txt는 정확히 한 줄이어야 함');

const index = await readFile(join(root, 'index.html'), 'utf8');
for (const formula of ['월 영업이익', '예상 월매출 − 예상 월 운영비', '영업이익률', '연간 예상 영업이익', '투자금 대비 연 수익률', '예상 회수기간']) {
  assert.ok(index.includes(formula), `메인 계산 기준 공식 누락: ${formula}`);
}
assert.match(index, /달방형 외주 린넨·세탁비를 0원으로 두는 기본 가정/, '달방형 세탁비 기본 가정 설명 누락');
assert.doesNotMatch(index, /js\/config\/estimation-config\.js/, '공개 UI에 내부 설정 경로 잔존');
assert.equal((index.match(/name="google-site-verification"/g) || []).length, 1, 'Google 검증 태그 누락 또는 중복');
assert.match(index, /<meta\s+name="google-site-verification"\s+content="Kmrve7O_QZcYI0ll4uTlnEJ3qaSIGvetpIIT8S5uNqc"\s*\/?>/i, 'Google 검증 토큰 불일치');
assert.equal((index.match(/name="google-adsense-account"/g) || []).length, 1, 'Google AdSense 계정 태그 누락 또는 중복');
assert.match(index, /<meta\s+name="google-adsense-account"\s+content="ca-pub-6886067012627803"\s*\/?>/i, 'Google AdSense 게시자 ID 불일치');
assert.equal((index.match(/name="naver-site-verification"/g) || []).length, 1, '네이버 검증 태그 누락 또는 중복');
assert.match(index, /<meta\s+name="naver-site-verification"\s+content="f644c3f1647776cc0fd728504d8080fb2e0d79d3"\s*\/?>/i, '네이버 검증 토큰 불일치');
const schemaText = index.match(/<script\s+id="site-schema"\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
const schema = JSON.parse(schemaText);
assert.ok(schema['@graph'].some((item) => item['@type'] === 'WebSite'));
assert.ok(schema['@graph'].some((item) => item['@type'] === 'SoftwareApplication'));
for (const item of schema['@graph']) assert.equal(item.url, `${siteUrl}/`, `${item['@type']}: structured data URL 불일치`);

const privacy = await readFile(join(root, 'privacy.html'), 'utf8');
assert.match(privacy, /https:\/\/policies\.google\.com\/technologies\/partner-sites/i, 'Google 데이터 처리 안내 링크 누락');
assert.match(privacy, /https:\/\/adssettings\.google\.com\//i, 'Google 광고 설정 링크 누락');
assert.doesNotMatch(privacy, /현재 코드에는 Google AdSense 광고 코드가 적용되어 있지 않습니다/, '과거 AdSense 미적용 문구 잔존');
for (const disclosure of ['쿠키', '웹 비콘', 'IP 주소', '브라우저 정보', '기기 관련 정보', '쿠키 식별자', 'localStorage', '제3자 광고']) {
  assert.ok(privacy.includes(disclosure), `개인정보처리방침 필수 고지 누락: ${disclosure}`);
}
assert.match(privacy, /심사·승인 상태와 운영 설정에 따라/, 'AdSense 상태의 조건부 표현 누락');
assert.match(privacy, /dirdhfm123@gmail\.com/i, '문의 이메일 누락');

console.log('seo tests: passed');
