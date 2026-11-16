import { load } from "cheerio";
import { DISCOUNT_PAGE_OVERRIDES, DISCOUNT_PAGES } from "@/config/sources";
import { logWarning } from "@/lib/log";
import { isPurchasable, type CollectedDeal } from "@/lib/types";
import { crawlerUserAgent, SOURCE_REVALIDATE_SECONDS } from "./http";

/** 할인율을 읽어도 되는 상품 페이지인지. 요청은 이 검사를 통과한 주소로만 보낸다. */
export function isDiscountPage(url: URL) {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  return DISCOUNT_PAGES.some(({ hosts, path }) => hosts.includes(url.hostname) && path.test(url.pathname));
}

/** 상품 페이지에 보이는 할인율이 하나로 정해질 때만 그 값을 반환한다. 쿠폰·카드·최대 할인 같은 조건부 할인은 무시한다. */
export function displayedDiscount(html: string) {
  const $ = load(html);
  const rates = new Set<number>();
  const selector = ".prod-info-price, .pdt_price, [class*='discountRate'], [class*='discount_rate'], [data-testid='discount-rate']";
  $(selector).each((_, node) => {
    if ($(node).closest("[hidden], [aria-hidden=true], [style*='display:none'], [style*='display: none']").length) return;
    const text = $(node).text().replace(/\s+/g, " ").trim();
    if (/최대|쿠폰|카드|적립|캐시백|옵션|다량/.test(text)) return;
    const matches = [...text.matchAll(/(?:^|[^\d.,~–～-])([1-9]\d?)\s*[%％]/g)];
    if (matches.length === 1) rates.add(Number(matches[0][1]));
  });
  return rates.size === 1 ? [...rates][0] : null;
}

async function readDiscount(link: string, budget: AbortSignal) {
  let url = new URL(link);
  const signal = AbortSignal.any([AbortSignal.timeout(5000), budget]);
  for (let step = 0; step < 4 && isDiscountPage(url); step++) {
    const response = await fetch(url, {
      headers: { "User-Agent": crawlerUserAgent() },
      redirect: "manual",
      signal,
      next: { revalidate: SOURCE_REVALIDATE_SECONDS },
    });
    const location = response.headers.get("location");
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      await response.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      return displayedDiscount(await response.text());
    }
    await response.body?.cancel();
    break;
  }
  return null;
}

/**
 * 구매 가능한 공구에 판매처가 표시한 할인율을 채운다. 판매처 응답이 느려도 피드가 늦어지지 않도록
 * 전체 시간을 budgetMs로 제한하고, 그 안에 읽지 못한 할인율은 null로 둔다.
 */
export async function enrichPurchaseDiscounts<T extends CollectedDeal>(deals: T[], { concurrency = 8, budgetMs = 4000 } = {}): Promise<T[]> {
  const queue = [...new Set(deals.filter(isPurchasable).map((deal) => deal.buyUrl!))];
  const budget = AbortSignal.timeout(budgetMs);
  const rates = new Map<string, number | null>();
  let skipped = 0;

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (budget.aborted) {
        skipped++;
        continue;
      }
      try {
        rates.set(url, await readDiscount(DISCOUNT_PAGE_OVERRIDES[url] ?? url, budget));
      } catch (error) {
        if (budget.aborted) skipped++;
        else logWarning("discount_fetch_failed", { host: new URL(url).host, error });
      }
    }
  }));

  if (skipped) logWarning("discount_budget_exhausted", { skipped, budgetMs });
  return deals.map((deal) => ({ ...deal, discountRate: isPurchasable(deal) ? rates.get(deal.buyUrl!) ?? null : null }));
}
