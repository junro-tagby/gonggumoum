import { LayoutGrid, List, Search } from "lucide-react";
import { CATEGORY_LABELS } from "@/config/categories";
import { STATUS_LABELS, type DealStatus } from "@/lib/types";

export type DealView = "grid" | "list";

interface Props {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  phase: DealStatus | "";
  onPhaseChange: (phase: DealStatus | "") => void;
  view: DealView;
  onViewChange: (view: DealView) => void;
  resultCount: number;
}

const phases = [["", "전체"], ...Object.entries(STATUS_LABELS)] as [DealStatus | "", string][];
const viewButton = "flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs aria-pressed:bg-action aria-pressed:text-white sm:text-sm";

export default function DealFilters({ keyword, onKeywordChange, category, onCategoryChange, phase, onPhaseChange, view, onViewChange, resultCount }: Props) {
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
          <Search size={18} aria-hidden="true" />
          <input aria-label="상품이나 인플루언서 검색" type="search" value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="상품이나 인플루언서 검색" className="w-full min-w-0 text-sm" />
        </label>
      </div>
      <div role="group" aria-label="상품 카테고리" className="mt-4 flex flex-wrap gap-2">
        {["", ...CATEGORY_LABELS].map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed={category === label}
            onClick={() => onCategoryChange(label)}
            className="min-h-10 rounded-full bg-surface-tint px-3 text-sm text-stone-700 aria-pressed:bg-action aria-pressed:text-white"
          >
            {label || "전체"}
          </button>
        ))}
      </div>
      <div role="group" aria-label="공구 상태" className="mt-5 flex flex-wrap gap-x-5 border-b border-stone-200">
        {phases.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={phase === value}
            onClick={() => onPhaseChange(value)}
            className="min-h-11 border-b-2 border-transparent px-1 text-sm text-stone-600 aria-pressed:border-brand aria-pressed:font-bold aria-pressed:text-brand"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-stone-600">총 {resultCount}개</p>
        <div role="group" aria-label="보기 방식" className="flex gap-1 rounded-lg bg-surface-tint p-1">
          <button type="button" aria-pressed={view === "grid"} onClick={() => onViewChange("grid")} className={viewButton}>
            <LayoutGrid size={16} aria-hidden="true" /> 카드 보기
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => onViewChange("list")} className={viewButton}>
            <List size={16} aria-hidden="true" /> 리스트 보기
          </button>
        </div>
      </div>
    </>
  );
}
