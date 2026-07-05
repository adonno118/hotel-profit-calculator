import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const pages = ['index.html', 'about.html', 'guide.html', 'privacy.html', 'disclaimer.html', 'contact.html'];
const canonicalUrls = [];

for (const page of pages) {
  const html = await readFile(join(root, page), 'utf8');
  assert.match(html, /<html\s+lang="ko"/i, `${page}: lang 누락`);
  assert.match(html, /<meta\s+name="viewport"/i, `${page}: viewport 누락`);
  assert.match(html, /<title>[^<]+<\/title>/i, `${page}: title 누락`);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${page}: description 누락`);
  assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/[^\"]+"/i, `${page}: canonical 누락`);
  assert.match(html, /<meta\s+property="og:url"\s+content="https:\/\/[^\"]+"/i, `${page}: og:url 누락`);
  assert.match(html, /<meta\s+name="twitter:card"/i, `${page}: Twitter 카드 누락`);
  assert.match(html, /<link\s+rel="icon"/i, `${page}: favicon 누락`);
  assert.match(html, /<h1[\s>]/i, `${page}: h1 누락`);

  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  canonicalUrls.push(canonical);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    await access(join(root, reference));
  }
}

const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
for (const url of canonicalUrls) assert.ok(sitemap.includes(`<loc>${url}</loc>`), `사이트맵 누락: ${url}`);
assert.equal((sitemap.match(/<url>/g) || []).length, pages.length, '사이트맵 URL 수 불일치');

const robots = await readFile(join(root, 'robots.txt'), 'utf8');
assert.match(robots, /User-agent:\s*\*/i);
assert.match(robots, /Allow:\s*\//i);
assert.match(robots, /Sitemap:\s*https:\/\//i);

const index = await readFile(join(root, 'index.html'), 'utf8');
const schemaText = index.match(/<script\s+id="site-schema"\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
const schema = JSON.parse(schemaText);
assert.ok(schema['@graph'].some((item) => item['@type'] === 'WebSite'));
assert.ok(schema['@graph'].some((item) => item['@type'] === 'SoftwareApplication'));

console.log('seo tests: passed');
