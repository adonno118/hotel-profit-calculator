export const EXAMPLE_MATCHES = Object.freeze({
  lodging: Object.freeze({
    around20: 'example-20-lodging',
    around30: 'example-30-lodging',
    over35: 'example-35-lodging'
  }),
  monthly: 'example-30-monthly',
  hybrid: 'example-32-hybrid'
});

export const getRecommendedExampleId = (operationType, roomScale) => {
  const match = EXAMPLE_MATCHES[operationType];
  if (!match) return null;
  if (typeof match === 'string') return match;
  return match[roomScale] || null;
};

const initializeExampleFinder = () => {
  const form = document.querySelector('[data-example-finder]');
  const result = document.querySelector('#example-finder-result');
  const cards = [...document.querySelectorAll('[data-card-scenario]')];
  if (!form || !result || cards.length === 0) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const operationType = form.elements.operationType?.value;
    const roomScale = form.elements.roomScale?.value;
    const targetId = getRecommendedExampleId(operationType, roomScale);
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;

    cards.forEach((card) => {
      const isTarget = card === target;
      card.classList.toggle('is-recommended', isTarget);
      card.querySelector('.recommendation-badge')?.toggleAttribute('hidden', !isTarget);
    });

    const title = target.querySelector('h4')?.textContent?.trim() || '가까운 사례';
    const detailLink = target.querySelector('h4 a')?.getAttribute('href') || '#profitability-examples-title';
    result.replaceChildren(document.createTextNode('선택 조건과 가까운 사례: '));
    const link = document.createElement('a');
    link.href = detailLink;
    link.textContent = title;
    result.append(link);

    target.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });
};

if (typeof document !== 'undefined') initializeExampleFinder();
