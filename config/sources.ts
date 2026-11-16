// 수집 대상과 사이트별 예외 규칙. 크롤러 로직은 이 파일의 값만 읽으므로,
// 공구 상품이나 판매처가 바뀌면 코드 대신 여기를 수정한다.

/** INPOCK_HANDLES 환경 변수가 없을 때 수집하는 인포크 프로필 */
export const DEFAULT_INPOCK_HANDLES = ["angelique", "masya", "chienj84"];

/** 한 번에 수집하는 인포크 프로필 최대 개수 */
export const MAX_INPOCK_HANDLES = 10;

export interface ProfileRule {
  /** 이 경로로 시작하는 구매 링크만 공구로 인정한다. */
  buyPathPrefix?: string;
  /**
   * 링크가 없는 캘린더 일정에, 같은 프로필의 링크 블록 중 제목이 일치하는 공구의 구매 링크를 붙인다.
   * 진행 중인 일정에만 적용된다.
   */
  calendarLinkFallbacks?: { calendarTitlePrefix: string; listingTitleIncludes: string }[];
}

/** 인포크 프로필별 예외 규칙 */
export const PROFILE_RULES: Record<string, ProfileRule> = {
  // 공구 섹션에 상품 상세가 아닌 링크(이벤트, 공지 등)가 섞여 있다.
  chienj84: { buyPathPrefix: "/Detail/" },
  // 캘린더 일정에는 링크가 없고, 같은 상품의 링크 블록이 따로 있다.
  angelique: {
    calendarLinkFallbacks: [
      { calendarTitlePrefix: "ALO 트레이닝 팬츠&후드집업", listingTitleIncludes: "알로 기모 2종 셋업" },
    ],
  },
};

/** 이 도메인(하위 도메인 포함)의 링크는 공구 구매 링크에서 제외한다. 예: 카카오톡 오픈채팅 */
export const EXCLUDED_BUY_HOSTS = ["kakao.com"];

/**
 * 할인율을 읽어 오는 판매처 상품 페이지. 할인율 수집은 이 목록에 있는 페이지에만 요청을 보내며,
 * 리다이렉트도 목록 안의 페이지로 이어질 때만 따라간다.
 */
export const DISCOUNT_PAGES: { hosts: string[]; path: RegExp }[] = [
  { hosts: ["kissme283.shop.blogpay.co.kr", "mj10130.shop.blogpay.co.kr"], path: /^\/(v\/g\/|view\/good\/|good\/product_view)/ },
  { hosts: ["heytem.kr"], path: /^\/Detail\/[a-z0-9]+$/i },
  { hosts: ["mkt.shopping.naver.com"], path: /^\/link\/[a-z0-9]+$/i },
  { hosts: ["smartstore.naver.com", "brand.naver.com"], path: /^\/[^/]+\/products\/\d+$/ },
  { hosts: ["app.wadiz.io"], path: /^\/links\/[a-z0-9]+$/i },
  { hosts: ["www.wadiz.io"], path: /^\/web\/campaign\/detail\/\d+$/ },
];

/** 구매 링크 대신 할인율을 읽을 상품 페이지. 담당자가 직접 확인한 대응만 넣는다. */
export const DISCOUNT_PAGE_OVERRIDES: Record<string, string> = {
  "https://mkt.shopping.naver.com/link/6af1795ee9f22e2e58bf018d": "https://smartstore.naver.com/decor-art/products/13862551879",
};
