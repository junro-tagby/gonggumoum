# 공구모음

인플루언서들의 공개 인포크 프로필과 Instagram `#공구` 게시물에서 진행 중인 공동구매를 모아 보여주는 웹 서비스입니다. Next.js 16(App Router), React 19, Tailwind CSS 4로 만들었습니다.

## 시작하기

Node.js 24 이상이 필요합니다.

```sh
npm ci
npm run dev        # http://localhost:3000
```

| 명령 | 내용 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 배포용 빌드와 실행 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 7 `tsc`로 타입 검사 |
| `npm test` | Vitest 단위 테스트 |

GitHub Actions(`.github/workflows/ci.yml`)가 push와 pull request마다 위 검사와 Docker 빌드를 실행합니다.

> TypeScript 7은 아직 컴파일러 API가 없어서 typescript-eslint가 동작하지 않습니다. 그래서 [공식 안내](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)대로 `typescript` 패키지 이름은 TS 6(`@typescript/typescript6`)에 연결하고, `tsc` 명령은 `@typescript/native`(TS 7)가 제공합니다. TypeScript 7.1에서 API가 나오면 이 별칭을 정리하세요.

## 환경 변수

`.env.example`을 `.env.local`로 복사해서 채웁니다. 모든 값은 선택 사항이며, 아무것도 없으면 기본 인포크 프로필 3곳만 수집합니다.

| 변수 | 설명 |
| --- | --- |
| `INPOCK_HANDLES` | 수집할 인포크 프로필(쉼표로 구분, 최대 10개) |
| `CRAWLER_CONTACT_URL` | 수집 요청 User-Agent에 붙는 연락처. 운영 환경에서는 설정하세요. |
| `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_GRAPH_VERSION` | Instagram Graph API 해시태그 조회. 세 값이 모두 있어야 동작합니다. 해시태그 검색은 전체 공개 검색이며 특정 프로필의 게시물만 반환하지 않습니다. |

## 구조

```
app/
  page.tsx               홈. 서버에서 피드를 수집해 렌더링하고, 목록은 준비되는 대로 스트리밍한다.
  error.tsx              렌더링 실패 화면
  api/crawl/route.ts     GET /api/crawl: 피드 JSON (외부 확인·모니터링용)
  api/health/route.ts    GET /api/health: 상태 확인
config/
  sources.ts             수집 대상과 사이트별 예외 규칙
  categories.ts          제목 키워드 기반 카테고리 분류
lib/
  types.ts               서버와 화면이 함께 쓰는 공구 데이터 형식
  feed.ts                수집 실행, 카테고리 부여, 실패 로깅, 동시 요청 합치기
  log.ts                 JSON 한 줄 로그
  crawl/http.ts          원본 요청(User-Agent, 시간 제한, 5분 캐시)과 링크 검증
  crawl/inpock.ts        인포크 프로필 파싱
  crawl/discount.ts      판매처 상품 페이지의 할인율 읽기
  crawl/instagram.ts     Instagram #공구 조회
components/
  DealBrowser.tsx        검색·필터 상태를 가진 클라이언트 컴포넌트
  RecommendedDeals.tsx   추천 공구 가로 스크롤
  DealFilters.tsx        검색창, 카테고리, 상태, 보기 방식
  DealList.tsx           카드/리스트 목록
  DealThumbnail.tsx      썸네일과 빈 이미지 아이콘
```

### 수집 흐름

1. `lib/feed.ts`가 인포크 프로필과 Instagram을 동시에 수집합니다. 일부가 실패해도 나머지는 표시하고, 실패한 프로필은 화면과 로그에 남깁니다.
2. 진행 중인 공구는 `config/sources.ts`의 `DISCOUNT_PAGES`에 있는 판매처 상품 페이지에서만 할인율을 읽습니다. 전체 4초 안에 읽지 못한 할인율은 비워 두므로, 판매처가 느려도 페이지는 늦어지지 않습니다.
3. 원본에 없는 가격, 구매 URL, 날짜는 추정하지 않습니다.

### 사이트별 예외를 바꿀 때

공구 상품이나 판매처가 바뀌면 크롤러 코드 대신 `config/sources.ts`를 수정합니다.

- `PROFILE_RULES`: 프로필별 규칙. 구매 링크 경로 제한(`buyPathPrefix`), 링크 없는 캘린더 일정에 같은 상품의 링크를 붙이는 규칙(`calendarLinkFallbacks`)
- `DISCOUNT_PAGES`: 할인율을 읽을 판매처와 상품 페이지 경로. 이 목록 밖으로는 요청하지 않습니다.
- `DISCOUNT_PAGE_OVERRIDES`: 마케팅 링크 대신 할인율을 읽을 상품 페이지
- `EXCLUDED_BUY_HOSTS`: 공구 링크에서 제외할 도메인

규칙을 바꾼 뒤에는 `npm test`로 파서 테스트를 확인하세요. 인포크 페이지 구조가 바뀌면 로그에 `InpockFormatError`가 남습니다.

## 운영

Docker를 지원하는 호스팅에서 이 저장소를 빌드 대상으로 지정하세요. 앱은 `PORT`(기본 3000)에서 수신합니다. HTTPS 도메인을 연결하고 상태 확인 경로는 `/api/health`로 지정하세요.

```sh
docker build -t gonggumoum .
docker run --rm -p 127.0.0.1:3000:3000 gonggumoum
```

- 환경 변수는 호스팅의 환경 변수 설정에 등록합니다.
- 수집 실패는 `{"level":"warn","event":"inpock_profile_failed",...}` 형식의 JSON 로그로 남습니다. `event` 값으로 검색하세요: `inpock_profile_failed`, `instagram_failed`, `discount_fetch_failed`, `discount_budget_exhausted`.
- 보안 헤더(CSP, `X-Frame-Options`, HSTS 등)는 `next.config.mjs`에서 설정합니다. 외부 스크립트나 분석 도구를 추가하면 CSP도 함께 수정해야 합니다.

## 수집 정책 점검 목록

코드로 해결할 수 없는 부분이라 출시 전에 담당자가 확인해야 합니다.

- [ ] 인포크, 각 판매처(blogpay, heytem, 네이버 스마트스토어, 와디즈), Instagram 이용약관에서 자동 수집과 상업적 재게시가 허용되는지
- [ ] 수집 대상 인플루언서에게 게시 동의를 받았는지, 요청 시 즉시 제외할 절차가 있는지(`INPOCK_HANDLES`에서 제거)
- [ ] 썸네일을 원본 서버에서 직접 불러와 보여주는 방식이 저작권·약관상 문제가 없는지
- [ ] 수집 요청이 robots.txt를 지키는지. 2026-11 기준으로 사용 중인 경로는 각 사이트 robots.txt에서 막혀 있지 않습니다.
- [ ] 운영 환경에 `CRAWLER_CONTACT_URL`을 설정해 판매처가 연락할 수 있는지

현재 코드에서 하는 일: 수집 요청에 `GongguMoumBot` User-Agent와 연락처를 밝히고, 원본 응답을 5분 동안 캐시해 요청 횟수를 줄이며, 공구 카드마다 원본 프로필이나 게시물로 가는 출처 링크를 표시합니다.
