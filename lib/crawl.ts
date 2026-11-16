import { load } from "cheerio";

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
  status: "PENDING" | "OPEN" | "CLOSED" | null;
}

interface Block {
  id: number;
  block_type: string;
  title?: string;
  url?: string;
  image?: string;
  is_open?: boolean;
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

function httpsLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function date(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function status(start: string | null, end: string | null, now: number): CollectedDeal["status"] {
  if (end && Date.parse(end) <= now) return "CLOSED";
  if (start && Date.parse(start) > now) return "PENDING";
  return start && end ? "OPEN" : null;
}

async function upstream(url: URL | string, headers?: HeadersInit) {
  const response = await fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
  if (!response.ok) throw new Error("Source unavailable");
  return response;
}

function purchasePage(url: URL) {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  const { hostname, pathname } = url;
  if (/^(kissme283|mj10130)\.shop\.blogpay\.co\.kr$/.test(hostname)) {
    return /^\/(v\/g\/|view\/good\/|good\/product_view)/.test(pathname);
  }
  if (hostname === "heytem.kr") return /^\/Detail\/[a-z0-9]+$/i.test(pathname);
  if (hostname === "mkt.shopping.naver.com") return /^\/link\/[a-z0-9]+$/i.test(pathname);
  if (hostname === "smartstore.naver.com" || hostname === "brand.naver.com") {
    return /^\/[^/]+\/products\/\d+$/.test(pathname);
  }
  if (hostname === "app.wadiz.io") return /^\/links\/[a-z0-9]+$/i.test(pathname);
  return hostname === "www.wadiz.io" && /^\/web\/campaign\/detail\/\d+$/.test(pathname);
}

function displayedDiscount(html: string) {
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

async function crawlPurchaseDiscount(link: string) {
  let url = new URL(link);
  const signal = AbortSignal.timeout(5000);
  for (let step = 0; step < 4 && purchasePage(url); step++) {
    const response = await fetch(url, { redirect: "manual", signal, next: { revalidate: 300 } });
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

// Map this marketing link to the product page confirmed by the user.
const decorArtMarketingLink = "https://mkt.shopping.naver.com/link/6af1795ee9f22e2e58bf018d";
const decorArtProductPage = "https://smartstore.naver.com/decor-art/products/13862551879";

export async function enrichPurchaseDiscounts(deals: CollectedDeal[]) {
  const urls = [...new Set(deals.flatMap((deal) =>
    deal.buyUrl && deal.status !== "PENDING" && deal.status !== "CLOSED" ? [deal.buyUrl] : [],
  ))];
  const rates = new Map<string, number | null>();
  for (let offset = 0; offset < urls.length; offset += 8) {
    await Promise.all(urls.slice(offset, offset + 8).map(async (url) => {
      rates.set(url, await crawlPurchaseDiscount(url === decorArtMarketingLink ? decorArtProductPage : url).catch(() => null));
    }));
  }
  return deals.map((deal) => ({
    ...deal,
    discountRate: deal.buyUrl && deal.status !== "PENDING" && deal.status !== "CLOSED" ? rates.get(deal.buyUrl) ?? null : null,
  }));
}

function thumbnail(value?: string) {
  if (value?.startsWith("images/")) {
    return httpsLink(`https://d13k46lqgoj3d6.cloudfront.net/${value.slice(7)}`);
  }
  return httpsLink(value?.startsWith("//") ? `https:${value}` : value);
}

export function parseInpock(html: string, handle: string, now = Date.now()): CollectedDeal[] {
  const sourceUrl = `https://link.inpock.co.kr/${handle}`;
  const $ = load(html);
  const data = JSON.parse($("#__NEXT_DATA__").text());
  const blocks: Block[] = data.props?.pageProps?.blocks;
  if (!Array.isArray(blocks)) throw new Error("Unknown Inpock format");
  const visible = new Set($("[data-preview-block-id]").map((_, node) => $(node).attr("data-preview-block-id")).get());
  const deals: CollectedDeal[] = [];
  let section = "";

  for (const block of blocks) {
    if (!visible.has(String(block.id))) continue;
    if (block.block_type === "text") section = block.title ?? "";
    if (block.block_type === "link" && /공구|공동구매/.test(section) && block.title) {
      const buyUrl = httpsLink(block.url);
      if (!buyUrl || /(^|\.)kakao\.com$/.test(new URL(buyUrl).hostname)) continue;
      if (handle === "chienj84" && !new URL(buyUrl).pathname.startsWith("/Detail/")) continue;
      const startDate = date(block.open_at);
      const endDate = date(block.open_until);
      const scheduled = status(startDate, endDate, now);
      deals.push({
        id: `inpock:${handle}:${block.id}`,
        title: block.title.replace(/\s+/g, " ").trim(),
        influencerName: handle,
        sourceUrl, thumbnailUrl: thumbnail(block.image), discountRate: null, buyUrl, startDate, endDate,
        status: scheduled ?? (/진행\s*중/.test(section) ? "OPEN" : null),
      });
    }
    if (block.block_type === "calendar" && Array.isArray(block.schedule_list)) {
      for (const event of block.schedule_list) {
        const startDate = date(event.start_at);
        const endDate = date(event.end_at);
        const phase = status(startDate, endDate, now);
        if (!event.title || !phase || phase === "CLOSED") continue;
        deals.push({
          id: `inpock:${handle}:calendar:${event.id}`,
          title: event.title, influencerName: handle, sourceUrl, thumbnailUrl: null, discountRate: null,
          buyUrl: httpsLink(event.url), startDate, endDate, status: phase,
        });
      }
    }
  }
  if (handle === "angelique") {
    const aloListing = deals.find((deal) =>
      !deal.id.includes(":calendar:") && deal.title.includes("알로 기모 2종 셋업"),
    );
    if (aloListing?.buyUrl) {
      for (const deal of deals) {
        if (deal.id.includes(":calendar:") && deal.status === "OPEN" && !deal.buyUrl &&
            deal.title.startsWith("ALO 트레이닝 팬츠&후드집업")) {
          deal.buyUrl = aloListing.buyUrl;
        }
      }
    }
  }
  return deals;
}

export async function crawlInpock(handle: string) {
  if (!/^[a-z0-9_.-]+$/i.test(handle) || handle === "." || handle === "..") throw new Error("Invalid handle");
  const response = await upstream(`https://link.inpock.co.kr/${handle}`);
  return parseInpock(await response.text(), handle);
}

export async function crawlInstagram(): Promise<CollectedDeal[] | null> {
  const { INSTAGRAM_ACCESS_TOKEN: token, INSTAGRAM_USER_ID: userId, INSTAGRAM_GRAPH_VERSION: version } = process.env;
  if (!token || !userId || !version) return null;
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(userId)) throw new Error("Invalid Instagram configuration");

  const base = `https://graph.facebook.com/${version}/`;
  const headers = { Authorization: `Bearer ${token}` };
  const lookup = new URL("ig_hashtag_search", base);
  lookup.search = new URLSearchParams({ user_id: userId, q: "공구" }).toString();
  const search = await (await upstream(lookup, headers)).json();
  const id = search.data?.[0]?.id;
  if (id == null) return [];
  if (typeof id !== "string" || !/^\d+$/.test(id)) throw new Error("Invalid hashtag identifier");

  const recent = new URL(`${id}/recent_media`, base);
  recent.search = new URLSearchParams({ user_id: userId, fields: "id,caption,permalink", limit: "25" }).toString();
  const result: { data: { id: string; caption?: string; permalink: string }[] } = await (await upstream(recent, headers)).json();
  return result.data.flatMap((post) => {
    const sourceUrl = httpsLink(post.permalink);
    if (!sourceUrl) return [];
    return [{
      id: `instagram:${post.id}`,
      title: post.caption?.trim().split("\n")[0].slice(0, 140) || "#공구 게시물",
      influencerName: null, sourceUrl, thumbnailUrl: null, discountRate: null, buyUrl: null, startDate: null, endDate: null, status: null,
    }];
  });
}
