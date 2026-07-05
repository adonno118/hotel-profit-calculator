# 모텔 수익률 계산기

Cloudflare Pages에 그대로 배포할 수 있는 정적 숙박업 손익 시뮬레이터입니다. 서버나 데이터베이스 없이 HTML, CSS, Vanilla JavaScript만 사용합니다.

## 로컬 실행

ES 모듈을 사용하므로 파일을 직접 열지 말고 정적 서버로 실행합니다.

```powershell
node tests/static-server.mjs
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다. 계산 테스트는 `npm test` 또는 다음 명령으로 실행합니다.

```powershell
node tests/calculator.test.js
node tests/storage.test.js
```

## Cloudflare Pages 배포

Git 저장소를 Cloudflare Pages에 연결한 뒤 Framework preset은 `None`, Build command는 비워 두고, Build output directory는 `/`로 지정합니다. 또는 이 디렉터리의 정적 파일을 Direct Upload로 업로드합니다. 별도의 환경 변수나 서버 함수는 필요하지 않습니다.

배포 전 `js/config/site-config.js`의 `siteUrl`과 `contactEmail`을 실제 값으로 변경하고, `robots.txt`와 `sitemap.xml`의 `example.com`도 실제 도메인으로 바꿉니다.

## 주요 구조

- `index.html`: 간편·상세 분석 화면과 결과 영역
- `about.html`, `guide.html`, `privacy.html`, `disclaimer.html`, `contact.html`: 신뢰·정책 콘텐츠
- `css/base.css`, `layout.css`, `components.css`, `calculator.css`, `responsive.css`: 토큰, 배치, 공통 요소, 계산기, 반응형 스타일
- `js/app.js`: 상태 변경과 각 모듈 연결
- `js/state.js`: 초기 상태와 예시 데이터
- `js/calculator.js`: 간편·상세·시나리오 계산 공식
- `js/ui.js`: 화면 렌더링과 사용자 이벤트
- `js/storage.js`: localStorage 자동 저장·복원·초기화
- `js/utils.js`: 숫자 검증과 원화·비율 포맷
- `js/config/site-config.js`: 사이트명, 연락처, 페이지별 SEO 메타데이터
- `js/config/estimation-config.js`: 공과금, 급여 부담, 매출 연동비와 빠른 객실당 매출 값
- `js/config/expense-templates.js`: 빠른 비용 항목
- `js/config/revenue-templates.js`: 빠른 매출 항목
- `js/config/scenarios.js`: 운영방식 비교용 상대 계수
- `tests/`: 계산·저장 테스트와 개발용 정적 서버

## 계산 공식

- 월 영업이익 = 월 총매출 - 월 총비용
- 연 영업이익 = 월 영업이익 × 12
- 영업이익률 = 월 영업이익 ÷ 월 총매출 × 100
- 1억 투자당 월 순익 = 월 영업이익 ÷ 총 투자비 × 100,000,000
- 1억 투자당 연 순익 = 연 영업이익 ÷ 총 투자비 × 100,000,000
- 단순 투자 회수기간 = 총 투자비 ÷ 연 영업이익

매출·투자비·객실 수가 0인 경우 관련 비율을 `계산 불가`로 처리하며, 영업손실이면 회수기간을 산정하지 않습니다.

## 확장 위치

새 비용·매출은 각 템플릿 설정 파일에 추가합니다. 공과금이나 자동 운영비 모델은 `estimation-config.js`의 계수와 `calculator.js`의 `estimateSimple()`을 확장합니다. 운영방식은 `scenarios.js`와 `compareScenarios()`에 추가합니다. 대출·세금처럼 독립 계산이 필요한 기능은 별도 계산 모듈을 만들고 `app.js`에서 상태와 UI를 연결하는 구조를 권장합니다.

`estimation-config.js`의 값은 공인된 업계 평균이 아닌 예시 추정 계수입니다. 실제 공개 서비스에서는 검증된 근거와 갱신일을 함께 관리해야 합니다.
