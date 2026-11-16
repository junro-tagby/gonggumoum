// 서버(/api/crawl, 페이지)와 화면 컴포넌트가 함께 쓰는 공구 데이터 형식

export type DealStatus = "PENDING" | "OPEN" | "CLOSED";

export const STATUS_LABELS: Record<DealStatus, string> = { OPEN: "진행 중", PENDING: "오픈 예정", CLOSED: "종료" };

/** 크롤러가 원본에서 읽은 공구. 원본에 없는 값은 추정하지 않고 null로 둔다. */
export interface CollectedDeal {
  id: string;
  title: string;
  influencerName: string | null;
  sourceUrl: string;
  thumbnailUrl: string | null;
  discountRate: number | null;
  buyUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  status: DealStatus | null;
}

export interface Deal extends CollectedDeal {
  category: string;
}

export interface Feed {
  inpock: Deal[];
  failedProfiles: string[];
  instagram: Deal[];
  instagramStatus: "ready" | "unavailable" | "unconfigured";
}

/** 구매 링크를 보여줄 수 있는 공구인지. 오픈 전이거나 종료된 공구는 링크를 숨긴다. */
export function isPurchasable(deal: CollectedDeal) {
  return Boolean(deal.buyUrl) && deal.status !== "PENDING" && deal.status !== "CLOSED";
}
