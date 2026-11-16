import type { Deal } from "@/lib/types";
import DealThumbnail from "./DealThumbnail";

const MAX_RECOMMENDED = 12;

/** 진행 중이고 구매 링크가 있는 공구를 구매 링크 기준으로 중복 없이 고른다. */
function pickRecommended(deals: Deal[]) {
  const seen = new Set<string>();
  return deals.filter((deal) => {
    if (deal.status !== "OPEN" || !deal.buyUrl || seen.has(deal.buyUrl)) return false;
    seen.add(deal.buyUrl);
    return true;
  }).slice(0, MAX_RECOMMENDED);
}

export default function RecommendedDeals({ deals }: { deals: Deal[] }) {
  const recommended = pickRecommended(deals);
  return (
    <section aria-labelledby="recommended-title" className="mt-5 rounded-2xl bg-surface-tint p-4 sm:p-5">
      <h3 id="recommended-title" className="font-extrabold text-brand">꼭 담아야 할 시즌 추천 공구</h3>
      <p className="mt-1 text-xs text-stone-600">지금 가장 많은 분들이 찾고 있는 추천템을 확인하세요</p>
      {recommended.length > 0 ? (
        <ul aria-label="시즌 추천 공구" tabIndex={0} className="mt-4 flex snap-x snap-mandatory scroll-px-[2px] gap-3 overflow-x-auto overscroll-x-contain px-[2px] pt-[2px] pb-3">
          {recommended.map((deal) => (
            <li key={deal.id} className="min-w-0 shrink-0 grow-0 basis-[82%] snap-start sm:basis-[calc((100%-1.5rem)/2.2)] lg:basis-[calc((100%-2.25rem)/3.2)]">
              <a href={deal.buyUrl!} target="_blank" rel="noopener noreferrer" className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white hover:border-brand">
                <div className="relative aspect-[2/1] overflow-hidden bg-white">
                  <DealThumbnail url={deal.thumbnailUrl} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 wrap-anywhere">
                  <p className="text-xs font-bold text-brand">{deal.influencerName} · 진행 중</p>
                  <h4 className="line-clamp-2 text-sm font-bold">{deal.title}</h4>
                  {deal.discountRate != null && <span className="self-start rounded bg-deal-soft px-1.5 text-sm font-bold text-discount">{deal.discountRate}% 할인</span>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-stone-600">현재 추천할 수 있는 진행 중 공구가 없습니다.</p>}
    </section>
  );
}
