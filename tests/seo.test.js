import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG } from '../public/js/config/site-config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const siteUrl = 'https://staycalculators.com';
const placeholderUrlPattern = /(?:ex(?:ample|maple)\.com|your[-_.]?(?:domain|site|url))/i;
const pages = ['index.html', 'about.html', 'guide.html', 'privacy.html', 'disclaimer.html', 'contact.html'];
const expectedUrls = new Map(pages.map((page) => [
  page,
  page === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${page.replace(/\.html$/, '')}`
]));
const canonicalUrls = [];
const titles = new Set();
const descriptions = new Set();

assert.equal(SITE_CONFIG.siteUrl, siteUrl, '중앙 사이트 URL 설정 불일치');
for (const url of expectedUrls.values()) {
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

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    const publicPath = reference === '/'
      ? 'index.html'
      : reference.startsWith('/') && !reference.split('/').at(-1).includes('.')
        ? `${reference.slice(1)}.html`
        : reference.replace(/^\//, '');
    await access(join(root, publicPath));
  }
}

const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
for (const url of canonicalUrls) assert.ok(sitemap.includes(`<loc>${url}</loc>`), `사이트맵 누락: ${url}`);
assert.equal((sitemap.match(/<url>/g) || []).length, pages.length, '사이트맵 URL 수 불일치');
assert.doesNotMatch(sitemap, placeholderUrlPattern, '사이트맵 placeholder URL 존재');

const robots = await readFile(join(root, 'robots.txt'), 'utf8');
assert.match(robots, /User-agent:\s*\*/i);
assert.match(robots, /Allow:\s*\//i);
assert.match(robots, new RegExp(`Sitemap:\\s*${siteUrl.replaceAll('.', '\\.')}\\/sitemap\\.xml`, 'i'));

const index = await readFile(join(root, 'index.html'), 'utf8');
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
assert.match(privacy, /dirdhfm123@gmail\.com/i, '문의 이메일 누락');

console.log('seo tests: passed');
