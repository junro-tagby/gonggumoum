"use client";

import { LayoutGrid, List, Search, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./CollectedDeals.module.css";
import type { CollectedDeal } from "@/lib/crawl";

interface Feed {
  inpock: CollectedDeal[];
  failedProfiles: string[];
  instagram: CollectedDeal[];
  instagramStatus: "ready" | "unavailable" | "unconfigured";
}

const labels = { OPEN: "진행 중", PENDING: "오픈 예정", CLOSED: "종료" };
const categories = [
  { label: "육아", pattern: /유아|아기|키즈|기저귀|젖병|유모차|장난감/i },
  { label: "뷰티", pattern: /화장품|스킨케어|미스트|샴푸|트리트먼트|제모기|고데기|드라이기|크림|세럼/i },
  { label: "식품", pattern: /초코파이|젤리|아르기닌|건강기능식품|그래놀라|커피|과자|오다다 티/i },
  { label: "패션", pattern: /니트|의류|팬츠|후드|셋업|슬리퍼|부츠|가방|캐리어|꼼데|어그/i },
  { label: "리빙", pattern: /카본매트|토퍼|밧드|밀폐용기|실리콘 컵|히터|웨건|카트|쉐이크보드|주방|수납/i },
];

const calendar = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default function CollectedDeals() {
  const [feed, setFeed] = useState<Feed>();
  const [failed, setFailed] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [phase, setPhase] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const listView = view === "list";
  const deals = feed ? [...feed.inpock, ...feed.instagram] : [];
  const recommended = deals
    .filter((deal, index, items) =>
      deal.status === "OPEN" && deal.buyUrl &&
      items.findIndex((item) => item.status === "OPEN" && item.buyUrl === deal.buyUrl) === index,
    )
    .slice(0, 12);
  const query = keyword.trim().toLowerCase();
  const filtered = deals.filter((deal) =>
    (!category || (categories.find(({ pattern }) => pattern.test(deal.title))?.label ?? "기타") === category) &&
    (!phase || deal.status === phase) &&
    `${deal.title} ${deal.influencerName ?? "Instagram"}`.toLowerCase().includes(query),
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/crawl", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Collection failed");
        return response.json();
      })
      .then(setFeed)
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-5 py-7" aria-labelledby="collected-title">
      <h2 id="collected-title" className="text-xl font-extrabold">공동구매 모아보기</h2>
      {failed && <p role="status" className="mt-3">수집 목록을 불러오지 못했습니다.</p>}
      {!feed && !failed && <p role="status" className="mt-3">공개 공구를 불러오는 중…</p>}
      {feed && <>
        {feed.failedProfiles.length > 0 && <p role="status" className="mt-3 text-sm">인포크 수집 실패 · {feed.failedProfiles.join(", ")}</p>}
        <section aria-labelledby="recommended-title" className="mt-5 rounded-2xl bg-surface-tint p-4 sm:p-5">
          <h3 id="recommended-title" className="font-extrabold text-brand">꼭 담아야 할 시즌 추천 공구</h3>
          <p className="mt-1 text-xs text-stone-600">지금 가장 많은 분들이 찾고 있는 추천템을 확인하세요</p>
          {recommended.length > 0 ? (
            <ul aria-label="시즌 추천 공구" tabIndex={0} className={styles.recommendations}>
              {recommended.map((deal) => (
                <li key={deal.id} className={styles.recommendation}>
                  <a href={deal.buyUrl!} target="_blank" rel="noopener noreferrer" className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white hover:border-brand">
                    <div className="relative aspect-[2/1] overflow-hidden bg-white">
                      {deal.thumbnailUrl
                        ? <img src={deal.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                        : <div className="grid h-full place-items-center text-brand"><ShoppingBag size={28} aria-hidden="true" /></div>}
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
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
            <Search size={18} aria-hidden="true" />
            <input aria-label="상품이나 인플루언서 검색" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="상품이나 인플루언서 검색" className="w-full min-w-0 text-sm" />
          </label>
        </div>
        <div role="group" aria-label="상품 카테고리" className="mt-4 flex flex-wrap gap-2">
          {["", ...categories.map(({ label }) => label), "기타"].map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={category === label}
              onClick={() => setCategory(label)}
              className="min-h-10 rounded-full bg-surface-tint px-3 text-sm text-stone-700 aria-pressed:bg-action aria-pressed:text-white"
            >
              {label || "전체"}
            </button>
          ))}
        </div>
        <div role="group" aria-label="공구 상태" className="mt-5 flex flex-wrap gap-x-5 border-b border-stone-200">
          {[["", "전체"], ...Object.entries(labels)].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={phase === value}
              onClick={() => setPhase(value)}
              className="min-h-11 border-b-2 border-transparent px-1 text-sm text-stone-600 aria-pressed:border-brand aria-pressed:font-bold aria-pressed:text-brand"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm text-stone-600">총 {filtered.length}개</p>
          <div role="group" aria-label="보기 방식" className="flex gap-1 rounded-lg bg-surface-tint p-1">
            <button type="button" aria-pressed={!listView} onClick={() => setView("grid")} className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs aria-pressed:bg-action aria-pressed:text-white sm:text-sm">
              <LayoutGrid size={16} aria-hidden="true" /> 카드 보기
            </button>
            <button type="button" aria-pressed={listView} onClick={() => setView("list")} className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs aria-pressed:bg-action aria-pressed:text-white sm:text-sm">
              <List size={16} aria-hidden="true" /> 리스트 보기
            </button>
          </div>
        </div>
        {filtered.length === 0 && <p className="mt-3">조건에 맞는 공구가 없습니다.</p>}
        <ul className={`mt-4 ${styles.results} ${listView ? "" : styles.cards}`}>
          {filtered.map((deal) => (
            <li key={deal.id} className={`rounded-xl border border-stone-200 bg-white ${styles.item} ${listView ? styles.row : styles.card}`}>
              <div className={`bg-surface-tint ${styles.thumbnail}`}>
                {deal.thumbnailUrl
                  ? <img src={deal.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                  : <div className="grid h-full place-items-center text-brand"><ShoppingBag aria-hidden="true" size={28} /></div>}
              </div>
              <div className={`flex flex-1 flex-col gap-2 ${styles.content} ${listView ? "" : "p-4"}`}>
                <p className="text-xs font-bold text-brand">{deal.influencerName ?? "Instagram #공구"}{deal.status && ` · ${labels[deal.status]}`}</p>
                <h3 className="font-bold">{deal.title}</h3>
                {deal.discountRate != null && (
                  <span className="self-start rounded bg-deal-soft px-1.5 text-sm font-bold text-discount">{deal.discountRate}% 할인</span>
                )}
                {(deal.startDate || deal.endDate) && <p className="text-xs text-stone-600">
                  {deal.startDate && `시작 ${calendar.format(new Date(deal.startDate))}`}
                  {deal.startDate && deal.endDate && " · "}
                  {deal.endDate && `종료 ${calendar.format(new Date(deal.endDate))}`}
                </p>}
                {deal.buyUrl && deal.status !== "PENDING" && deal.status !== "CLOSED" && (
                  <a
                    href={deal.buyUrl}
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
        {feed.instagramStatus === "unavailable" && <p className="mt-3 text-sm text-stone-600">
          Instagram #공구 수집에 실패했습니다.
        </p>}
      </>}
    </section>
  );
}
