import { load } from "cheerio";
import { EXCLUDED_BUY_HOSTS, PROFILE_RULES, type ProfileRule } from "@/config/sources";
import type { CollectedDeal, DealStatus } from "@/lib/types";
import { fetchSource, httpsLink } from "./http";

interface Block {
  id: number;
  block_type: string;
  title?: string;
  url?: string;
  image?: string;
  open_at?: string | null;
  open_until?: string | null;
  schedule_list?: CalendarEvent[];
}

interface CalendarEvent {
  id: number;
  title: string;
  url: string | null;
  start_at: string;
  end_at: string;
}

export class InpockFormatError extends Error {
  name = "InpockFormatError";
}

function isoDate(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function phase(start: string | null, end: string | null, now: number): DealStatus | null {
  if (end && Date.parse(end) <= now) return "CLOSED";
  if (start && Date.parse(start) > now) return "PENDING";
  return start && end ? "OPEN" : null;
}

function thumbnail(value?: string) {
  if (value?.startsWith("images/")) return httpsLink(`https://d13k46lqgoj3d6.cloudfront.net/${value.slice(7)}`);
  return httpsLink(value?.startsWith("//") ? `https:${value}` : value);
}

function isExcludedHost(hostname: string) {
  return EXCLUDED_BUY_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function readBlocks(html: string) {
  const $ = load(html);
  const script = $("#__NEXT_DATA__").text();
  if (!script) throw new InpockFormatError("Inpock page has no __NEXT_DATA__ script");
  let data;
  try {
    data = JSON.parse(script);
  } catch (error) {
    throw new InpockFormatError("Inpock __NEXT_DATA__ is not valid JSON", { cause: error });
  }
  const blocks: Block[] | undefined = data?.props?.pageProps?.blocks;
  if (!Array.isArray(blocks)) throw new InpockFormatError("Inpock __NEXT_DATA__ has no props.pageProps.blocks");
  // 인포크는 숨긴 블록도 데이터에 남기므로, 페이지에 실제로 그려진 블록만 쓴다.
  const visible = new Set($("[data-preview-block-id]").map((_, node) => $(node).attr("data-preview-block-id")).get());
  return blocks.filter((block) => visible.has(String(block.id)));
}

/** 인포크 프로필 페이지에서 "공구"/"공동구매" 섹션의 링크와 캘린더 일정을 공구로 읽는다. */
export function parseInpock(html: string, handle: string, now = Date.now(), rule: ProfileRule = PROFILE_RULES[handle] ?? {}): CollectedDeal[] {
  const sourceUrl = `https://link.inpock.co.kr/${handle}`;
  const deals: CollectedDeal[] = [];
  const listings: CollectedDeal[] = [];
  let section = "";

  for (const block of readBlocks(html)) {
    if (block.block_type === "text") section = block.title ?? "";
    if (block.block_type === "link" && /공구|공동구매/.test(section) && block.title) {
      const buyUrl = httpsLink(block.url);
      if (!buyUrl) continue;
      const { hostname, pathname } = new URL(buyUrl);
      if (isExcludedHost(hostname)) continue;
      if (rule.buyPathPrefix && !pathname.startsWith(rule.buyPathPrefix)) continue;
      const startDate = isoDate(block.open_at);
      const endDate = isoDate(block.open_until);
      const listing: CollectedDeal = {
        id: `inpock:${handle}:${block.id}`,
        title: block.title.replace(/\s+/g, " ").trim(),
        influencerName: handle,
        sourceUrl,
        thumbnailUrl: thumbnail(block.image),
        discountRate: null,
        buyUrl,
        startDate,
        endDate,
        status: phase(startDate, endDate, now) ?? (/진행\s*중/.test(section) ? "OPEN" : null),
      };
      deals.push(listing);
      listings.push(listing);
    }
    if (block.block_type === "calendar" && Array.isArray(block.schedule_list)) {
      for (const event of block.schedule_list) {
        const startDate = isoDate(event.start_at);
        const endDate = isoDate(event.end_at);
        const status = phase(startDate, endDate, now);
        if (!event.title || !status || status === "CLOSED") continue;
        deals.push({
          id: `inpock:${handle}:calendar:${event.id}`,
          title: event.title,
          influencerName: handle,
          sourceUrl,
          thumbnailUrl: null,
          discountRate: null,
          buyUrl: httpsLink(event.url),
          startDate,
          endDate,
          status,
        });
      }
    }
  }

  for (const fallback of rule.calendarLinkFallbacks ?? []) {
    const buyUrl = listings.find((listing) => listing.title.includes(fallback.listingTitleIncludes))?.buyUrl;
    if (!buyUrl) continue;
    for (const deal of deals) {
      if (deal.id.includes(":calendar:") && deal.status === "OPEN" && !deal.buyUrl && deal.title.startsWith(fallback.calendarTitlePrefix)) {
        deal.buyUrl = buyUrl;
      }
    }
  }
  return deals;
}

export async function crawlInpock(handle: string) {
  if (!/^[a-z0-9_.-]+$/i.test(handle) || handle === "." || handle === "..") throw new Error(`Invalid Inpock handle: ${handle}`);
  const response = await fetchSource(`https://link.inpock.co.kr/${handle}`);
  return parseInpock(await response.text(), handle);
}
