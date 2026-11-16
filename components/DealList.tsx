import { isPurchasable, STATUS_LABELS, type Deal } from "@/lib/types";
import type { DealView } from "./DealFilters";
import DealThumbnail from "./DealThumbnail";

const calendar = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default function DealList({ deals, view }: { deals: Deal[]; view: DealView }) {
  const list = view === "list";
  if (deals.length === 0) return <p className="mt-3">조건에 맞는 공구가 없습니다.</p>;
  return (
    <ul className={`mt-4 grid grid-cols-1 gap-3 ${list ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {deals.map((deal) => (
        <li
          key={deal.id}
          className={`relative isolate min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white ${
            list ? "grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 p-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4 sm:p-4" : "flex flex-col"
          }`}
        >
          <div className={`relative overflow-hidden bg-surface-tint ${list ? "aspect-square rounded-lg" : "aspect-[2/1]"}`}>
            <DealThumbnail url={deal.thumbnailUrl} />
          </div>
          <div className={`flex min-w-0 flex-1 flex-col gap-2 wrap-anywhere ${list ? "" : "p-4"}`}>
            <p className="text-xs font-bold text-brand">
              {/* 출처 표시: 원본 프로필이나 게시물로 연결한다. 카드 전체를 덮는 구매 링크보다 위에 둔다. */}
              <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer" className="relative z-20 hover:underline">
                {deal.influencerName ?? "Instagram #공구"}
              </a>
              {deal.status && ` · ${STATUS_LABELS[deal.status]}`}
            </p>
            <h3 className="font-bold">{deal.title}</h3>
            {deal.discountRate != null && (
              <span className="self-start rounded bg-deal-soft px-1.5 text-sm font-bold text-discount">{deal.discountRate}% 할인</span>
            )}
            {(deal.startDate || deal.endDate) && <p className="text-xs text-stone-600">
              {deal.startDate && `시작 ${calendar.format(new Date(deal.startDate))}`}
              {deal.startDate && deal.endDate && " · "}
              {deal.endDate && `종료 ${calendar.format(new Date(deal.endDate))}`}
            </p>}
            {isPurchasable(deal) && (
              <a
                href={deal.buyUrl!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${deal.title} 구매 링크 (새 탭)`}
                className="absolute inset-0 z-10 block rounded-xl hover:ring-2 hover:ring-inset hover:ring-brand focus-visible:outline-offset-[-3px]"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
