import { SITE_CONFIG, applySiteMetadata } from './config/site-config.js';
applySiteMetadata();
document.querySelectorAll('[data-contact-email]').forEach((link) => { link.textContent = SITE_CONFIG.contactEmail; link.href = `mailto:${SITE_CONFIG.contactEmail}`; });
