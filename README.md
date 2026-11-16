# 공구모음

`npm ci`로 패키지를 설치하고 `npm run dev`를 실행한 뒤 http://localhost:3000 을 여세요.

`npm run build`로 배포용 빌드를 확인할 수 있습니다. 홈에서는 공개 인포크 데이터를 표시합니다.

## 공개 공구 수집

`GET /api/crawl`에서 인포크 링크와 일정, 그리고 연결된 경우 Instagram `#공구` 최근 게시물을 반환합니다. 홈의 **실시간 수집 공구**에 표시됩니다. 원본 조회는 5분 동안 캐시됩니다.

- 인포크는 기본으로 `angelique`, `masya`, `chienj84`를 읽습니다. 다른 공개 프로필을 추가하려면 `.env.example`을 `.env.local`로 복사하고 `INPOCK_HANDLES=angelique,another_handle`처럼 쉼표로 구분하세요. 개발 서버를 다시 시작하면 적용됩니다.
- Instagram은 Facebook 로그인 기반 Instagram Graph API의 해시태그 조회를 사용합니다. 접근 권한을 갖춘 토큰, 연결된 Instagram 프로페셔널 계정의 숫자 ID, 해당 앱에서 사용하는 Graph API 버전을 `.env.local`에 설정하세요. 해시태그 검색은 전체 공개 검색이며 특정 프로필의 게시물만 반환하는 기능이 아닙니다.
- 원본에 없는 가격, 구매 URL, 날짜는 추정하지 않습니다.

## 외부 공개용 운영 서버

Docker를 지원하는 호스팅에서 이 폴더를 빌드 대상으로 지정하세요. 앱은 호스팅이 제공하는 `PORT`에서 수신하며 기본 포트는 3000입니다. 호스팅의 HTTPS 도메인을 연결하고, 상태 확인 경로는 `/api/health`로 지정하세요.

```sh
docker build -t gonggu-moem .
docker run --rm -p 127.0.0.1:3000:3000 gonggu-moem
```

위 실행 명령은 로컬 검증용입니다. 운영 환경의 `INPOCK_HANDLES`와 선택 사항인 Instagram 설정은 호스팅의 환경 변수에 등록하세요. 기본 인포크 프로필 3곳은 환경 변수 없이 수집합니다. 상태 확인은 앱의 응답 여부를 검사하며, 외부 판매처의 응답은 `/api/crawl`에서 확인할 수 있습니다.
