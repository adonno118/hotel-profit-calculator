import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(projectRoot, 'public');
const siteUrl = 'https://staycalculators.com';
const guideFiles = (await readdir(join(publicRoot, 'guide'))).filter((file) => file.endsWith('.html')).sort();
const exampleFiles = (await readdir(join(publicRoot, 'examples'))).filter((file) => file.endsWith('.html')).sort();
const corePages = [
  { file: 'index.html', path: '/' },
  { file: 'about.html', path: '/about' },
  { file: 'guide.html', path: '/guide' },
  { file: 'privacy.html', path: '/privacy' },
  { file: 'disclaimer.html', path: '/disclaimer' },
  { file: 'contact.html', path: '/contact' }
];
const contentPages = [
  ...guideFiles.map((file) => ({ file: join('guide', file), path: `/guide/${file.replace(/\.html$/, '')}` })),
  ...exampleFiles.map((file) => ({ file: join('examples', file), path: `/examples/${file.replace(/\.html$/, '')}` }))
];

assert.equal(contentPages.length, 17, 'extensionless 콘텐츠 URL은 정확히 17개여야 함');
for (const page of contentPages) {
  const html = await readFile(join(publicRoot, page.file), 'utf8');
  const canonical = `${siteUrl}${page.path}`;
  assert.match(html, new RegExp(`<link\\s+rel="canonical"\\s+href="${canonical.replaceAll('.', '\\.')}">`, 'i'), `${page.file}: extensionless canonical 누락`);
  assert.match(html, new RegExp(`<meta\\s+property="og:url"\\s+content="${canonical.replaceAll('.', '\\.')}">`, 'i'), `${page.file}: extensionless og:url 누락`);
  const schemaBlocks = [...html.matchAll(/<script(?:\s+id="[^"]+")?\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((match) => JSON.parse(match[1]));
  const nodes = schemaBlocks.flatMap((item) => item['@graph'] || [item]);
  assert.ok(nodes.some((node) => node['@type'] === 'WebPage' && node.url === canonical), `${page.file}: WebPage URL 불일치`);
  const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
  assert.equal(breadcrumb?.itemListElement?.at(-1)?.item, canonical, `${page.file}: Breadcrumb 현재 URL 불일치`);
  assert.doesNotMatch(html, /(?:https:\/\/staycalculators\.com)?\/(?:guide|examples)\/[^"'#?\s<>]+\.html/i, `${page.file}: old .html URL 잔존`);
}

const redirectsText = await readFile(join(publicRoot, '_redirects'), 'utf8');
const redirectLines = redirectsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const canonicalPages = [...corePages, ...contentPages];
assert.equal(redirectLines.length, canonicalPages.length, '영구 redirect 규칙 수 불일치');
const redirects = new Map();
for (const line of redirectLines) {
  const [source, destination, status, extra] = line.split(/\s+/);
  assert.equal(extra, undefined, `redirect 규칙 열 수 오류: ${line}`);
  assert.equal(status, '301', `영구 redirect 상태 오류: ${line}`);
  assert.match(source, /\.html$/, `redirect source는 .html이어야 함: ${line}`);
  assert.doesNotMatch(destination, /\.html$/, `redirect destination은 extensionless여야 함: ${line}`);
  assert.notEqual(source, destination, `redirect self-loop: ${line}`);
  assert.ok(!redirects.has(source), `redirect source 중복: ${source}`);
  redirects.set(source, destination);
}

for (const page of canonicalPages) {
  const source = page.path === '/' ? '/index.html' : `${page.path}.html`;
  assert.equal(redirects.get(source), page.path, `redirect 대상 불일치: ${source}`);
  assert.ok(!redirects.has(page.path), `redirect chain 또는 loop 가능성: ${page.path}`);
}

const sitemap = await readFile(join(publicRoot, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const [source, destination] of redirects) {
  assert.ok(!sitemapUrls.includes(`${siteUrl}${source}`), `sitemap에 redirect source 포함: ${source}`);
  assert.ok(sitemapUrls.includes(`${siteUrl}${destination}`), `sitemap canonical 누락: ${destination}`);
}

const wrangler = JSON.parse(await readFile(join(projectRoot, 'wrangler.jsonc'), 'utf8'));
assert.equal(wrangler.assets.html_handling, 'auto-trailing-slash', 'Cloudflare extensionless 정책 미고정');

console.log('url policy tests: passed');
