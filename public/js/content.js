import { SITE_CONFIG, applySiteMetadata } from './config/site-config.js';
applySiteMetadata();
document.querySelectorAll('[data-contact-email]').forEach((link) => { link.textContent = SITE_CONFIG.contactEmail; link.href = `mailto:${SITE_CONFIG.contactEmail}`; });

const footerLinks = [
  ['/about', '소개'],
  ['/contact', '문의'],
  ['/privacy', '개인정보처리방침'],
  ['/terms', '이용약관'],
  ['/disclaimer', '면책 안내']
];
document.querySelectorAll('.site-footer nav').forEach((nav) => {
  const existing = new Set([...nav.querySelectorAll('a')].map((link) => link.getAttribute('href')));
  footerLinks.forEach(([href, label]) => {
    if (existing.has(href)) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    nav.append(link);
  });
});
