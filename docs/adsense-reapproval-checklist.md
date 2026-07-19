# AdSense 재심사 전 체크리스트

## 콘텐츠 준비

- [x] 신뢰 페이지 구조: `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`
- [x] `/terms` 본문·canonical·OG URL·301·sitemap 연결
- [x] `/about`에 공개 가능한 운영 경험과 제작 동기 반영
- [x] 메인에 투자비·고정비·운영방식·연면적·인건비 해설 보강
- [x] 기존 guide 허브의 운영 형태 설명과 관련 가이드 연결 확인
- [x] 가이드 12개를 페이지별 고유 역할에 맞춰 운영자 관점 보강
- [x] 사례 5개에 공통 매물 검토 포인트 보강
- [x] 모든 사용자 경험 표시가 `docs/adsense-user-questions.md` 답변에 근거하는지 확인

## 기술·SEO

- [x] sitemap에 `/terms` 추가, extensionless URL 사용
- [x] `/terms.html` → `/terms` 301 규칙 추가
- [x] 주요 페이지 canonical과 `og:url` extensionless 점검
- [x] robots.txt가 주요 페이지를 차단하지 않음
- [x] 주요 페이지에 noindex 없음
- [x] footer 신뢰 페이지 링크 보강
- [ ] 배포 후 `.html` 요청이 실제로 한 번의 301로 extensionless URL에 도착하는지 확인
- [ ] 배포 후 주요 URL의 HTTP 200, canonical, 렌더링 확인
- [ ] Search Console sitemap 재제출 또는 갱신 인식 확인

## Search Console URL 검사 우선순위

1. `https://staycalculators.com/`
2. `https://staycalculators.com/guide`
3. `https://staycalculators.com/about`
4. `https://staycalculators.com/privacy`
5. `https://staycalculators.com/terms`
6. `https://staycalculators.com/disclaimer`
7. `https://staycalculators.com/contact`
8. 대표 가이드: `/guide/lodging-investment-checklist`, `/guide/motel-operating-cost`, `/guide/motel-roi-payback`
9. 대표 사례: `/examples/30-room-lodging-example`, `/examples/30-room-monthly-stay-example`, `/examples/32-room-hybrid-example`

## 재신청 전 운영 확인

- [ ] 사용자 질문 답변을 반영한 뒤 사실관계와 공개 범위 재검토
- [ ] 모바일/데스크톱에서 계산기와 모든 신뢰 페이지 수동 확인
- [ ] 깨진 링크, 빈 섹션, 임시 문구와 `[사용자 답변 필요]`가 공개 페이지에 없는지 확인
- [ ] 광고가 본문·내비게이션·계산기 조작을 방해하지 않는지 확인
- [ ] 개인정보처리방침이 실제 광고·분석 도구 사용 상태와 일치하는지 확인
- [ ] AdSense 정책 알림과 사이트 소유권 상태 확인
- [ ] 배포 후 Search Console에서 핵심 URL의 실시간 테스트 및 색인 생성 요청

재신청은 변경 페이지가 배포되고 Search Console에서 핵심 URL을 다시 크롤링한 사실을 확인한 뒤 진행하는 편이 안전하다. 고정된 승인 대기 기간은 없으므로 “며칠 경과”만으로 판단하지 말고, sitemap 처리와 주요 URL 색인 상태를 기준으로 삼는다. 배포와 재신청은 사용자 승인 후 별도로 수행한다.

## 운영 후속 TODO

- 현재 공개 이메일은 `SITE_CONFIG.contactEmail`의 기존 주소를 사용한다. 장기적으로 `contact@staycalculators.com` 같은 도메인 전용 이메일을 준비하면 중앙 설정값 한 곳만 교체하고 수신 테스트를 진행한다.
- 현재 별도 방문자 분석 스크립트는 설치되어 있지 않다. Analytics를 실제 도입할 때에만 개인정보처리방침과 동의 구성을 갱신한다.
