export const SITE_CONFIG = {
  name: '모텔 수익률 계산기',
  siteUrl: 'https://example.com', // 배포 후 실제 도메인으로 변경
  locale: 'ko_KR',
  contactEmail: 'contact@example.com', // 운영 문의 메일로 변경
  description: '모텔·호텔·중소형 숙박업 매물의 예상 매출, 운영비, 영업이익과 투자 수익성을 빠르게 검토하는 참고용 손익 시뮬레이터',
  pages: {
    '/': { title: '모텔 수익률 계산기 | 숙박업 손익·투자 분석', description: '객실당 매출, 월세, 인건비와 운영비를 입력해 모텔 매물의 월 영업이익과 투자 회수기간을 계산해 보세요.' },
    '/about.html': { title: '사이트 소개 | 모텔 수익률 계산기', description: '모텔 및 중소형 숙박업 매물 검토를 돕는 참고용 손익 계산 서비스의 목적과 원칙을 안내합니다.' },
    '/guide.html': { title: '이용 가이드 | 모텔 수익률 계산기', description: '객실 수, 매출, 고정비·변동비, 공과금과 투자비를 입력하고 모텔 손익 계산 결과를 해석하는 방법입니다.' },
    '/privacy.html': { title: '개인정보처리방침 | 모텔 수익률 계산기', description: '브라우저 저장소, 쿠키, 향후 광고 서비스와 개인정보 처리 원칙을 안내합니다.' },
    '/disclaimer.html': { title: '면책 안내 | 모텔 수익률 계산기', description: '숙박업 손익 추정 결과의 범위와 투자 전 확인해야 할 사항을 안내합니다.' },
    '/contact.html': { title: '문의 안내 | 모텔 수익률 계산기', description: '서비스 이용, 오류 제보, 개인정보 관련 문의 방법을 안내합니다.' }
  }
};

export function applySiteMetadata(pathname = window.location.pathname) {
  const requestedPath = pathname.endsWith('/') ? '/' : pathname;
  const path = requestedPath === '/index.html' ? '/' : requestedPath;
  const page = SITE_CONFIG.pages[path] || SITE_CONFIG.pages['/'];
  document.title = page.title;
  document.querySelectorAll('[data-site-name]').forEach((el) => { el.textContent = SITE_CONFIG.name; });
  const values = {
    'meta[name="description"]': page.description,
    'meta[property="og:title"]': page.title,
    'meta[property="og:description"]': page.description,
    'meta[property="og:url"]': `${SITE_CONFIG.siteUrl}${path}`,
    'meta[name="twitter:title"]': page.title,
    'meta[name="twitter:description"]': page.description
  };
  Object.entries(values).forEach(([selector, content]) => {
    const node = document.querySelector(selector);
    if (node) node.setAttribute('content', content);
  });
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `${SITE_CONFIG.siteUrl}${path}`;
  const schema = document.getElementById('site-schema');
  if (schema && path === '/') {
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: SITE_CONFIG.name,
      url: SITE_CONFIG.siteUrl, applicationCategory: 'FinanceApplication', operatingSystem: 'Any',
      inLanguage: 'ko-KR', description: SITE_CONFIG.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }
    });
  }
}
