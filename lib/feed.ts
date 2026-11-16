import { categorize } from "@/config/categories";
import { DEFAULT_INPOCK_HANDLES, MAX_INPOCK_HANDLES } from "@/config/sources";
import { enrichPurchaseDiscounts } from "@/lib/crawl/discount";
import { crawlInpock } from "@/lib/crawl/inpock";
import { crawlInstagram } from "@/lib/crawl/instagram";
import { logWarning } from "@/lib/log";
import type { CollectedDeal, Feed } from "@/lib/types";

function inpockHandles() {
  const configured = process.env.INPOCK_HANDLES?.split(",").map((handle) => handle.trim()).filter(Boolean);
  return [...new Set(configured?.length ? configured : DEFAULT_INPOCK_HANDLES)].slice(0, MAX_INPOCK_HANDLES);
}

function withCategory(deals: CollectedDeal[]) {
  return deals.map((deal) => ({ ...deal, category: categorize(deal.title) }));
}

async function collectFeed(): Promise<Feed> {
  const handles = inpockHandles();
  const [inpock, [instagram]] = await Promise.all([
    Promise.allSettled(handles.map(crawlInpock)),
    Promise.allSettled([crawlInstagram()]),
  ]);

  const failedProfiles = handles.filter((handle, index) => {
    const result = inpock[index];
    if (result.status === "rejected") logWarning("inpock_profile_failed", { handle, error: result.reason });
    return result.status === "rejected";
  });
  if (instagram.status === "rejected") logWarning("instagram_failed", { error: instagram.reason });

  return {
    inpock: await enrichPurchaseDiscounts(withCategory(inpock.flatMap((result) => result.status === "fulfilled" ? result.value : []))),
    failedProfiles,
    instagram: withCategory(instagram.status === "fulfilled" ? instagram.value ?? [] : []),
    instagramStatus: instagram.status === "rejected" ? "unavailable" : instagram.value === null ? "unconfigured" : "ready",
  };
}

let inFlight: Promise<Feed> | undefined;

/** 공구 피드를 수집한다. 동시에 들어온 요청은 같은 수집 결과를 함께 기다린다. */
export function getFeed() {
  inFlight ??= collectFeed().finally(() => { inFlight = undefined; });
  return inFlight;
}

export function isHealthy(feed: Feed) {
  return feed.failedProfiles.length === 0 && feed.instagramStatus !== "unavailable";
}
