"use client";

import { useState } from "react";
import type { DealStatus, Feed } from "@/lib/types";
import DealFilters, { type DealView } from "./DealFilters";
import DealList from "./DealList";
import RecommendedDeals from "./RecommendedDeals";

export default function DealBrowser({ feed }: { feed: Feed }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [phase, setPhase] = useState<DealStatus | "">("");
  const [view, setView] = useState<DealView>("grid");

  const deals = [...feed.inpock, ...feed.instagram];
  const query = keyword.trim().toLowerCase();
  const filtered = deals.filter((deal) =>
    (!category || deal.category === category) &&
    (!phase || deal.status === phase) &&
    `${deal.title} ${deal.influencerName ?? "Instagram"}`.toLowerCase().includes(query),
  );

  return (
    <>
      {feed.failedProfiles.length > 0 && <p role="status" className="mt-3 text-sm">인포크 수집 실패 · {feed.failedProfiles.join(", ")}</p>}
      <RecommendedDeals deals={deals} />
      <DealFilters
        keyword={keyword} onKeywordChange={setKeyword}
        category={category} onCategoryChange={setCategory}
        phase={phase} onPhaseChange={setPhase}
        view={view} onViewChange={setView}
        resultCount={filtered.length}
      />
      <DealList deals={filtered} view={view} />
      {feed.instagramStatus === "unavailable" && <p className="mt-3 text-sm text-stone-600">Instagram #공구 수집에 실패했습니다.</p>}
    </>
  );
}
