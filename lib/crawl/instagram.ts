import type { CollectedDeal } from "@/lib/types";
import { fetchSource, httpsLink } from "./http";

interface HashtagSearch {
  data?: { id?: unknown }[];
}

interface RecentMedia {
  data?: { id: string; caption?: string; permalink?: string }[];
}

/**
 * Instagram Graph API로 #공구 해시태그의 최근 게시물을 읽는다. 환경 변수가 없으면 null을 반환한다.
 * 해시태그 검색은 전체 공개 검색이며 특정 프로필의 게시물만 반환하지 않는다.
 */
export async function crawlInstagram(): Promise<CollectedDeal[] | null> {
  const { INSTAGRAM_ACCESS_TOKEN: token, INSTAGRAM_USER_ID: userId, INSTAGRAM_GRAPH_VERSION: version } = process.env;
  if (!token || !userId || !version) return null;
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(userId)) throw new Error("Invalid Instagram configuration");

  const base = `https://graph.facebook.com/${version}/`;
  const headers = { Authorization: `Bearer ${token}` };
  const lookup = new URL("ig_hashtag_search", base);
  lookup.search = new URLSearchParams({ user_id: userId, q: "공구" }).toString();
  const search: HashtagSearch = await (await fetchSource(lookup, { headers })).json();
  const id = search.data?.[0]?.id;
  if (id == null) return [];
  if (typeof id !== "string" || !/^\d+$/.test(id)) throw new Error("Invalid hashtag identifier");

  const recent = new URL(`${id}/recent_media`, base);
  recent.search = new URLSearchParams({ user_id: userId, fields: "id,caption,permalink", limit: "25" }).toString();
  const result: RecentMedia = await (await fetchSource(recent, { headers })).json();
  if (!Array.isArray(result.data)) throw new Error("Instagram recent_media response has no data array");
  return result.data.flatMap((post) => {
    const sourceUrl = httpsLink(post.permalink);
    if (!sourceUrl) return [];
    return [{
      id: `instagram:${post.id}`,
      title: post.caption?.trim().split("\n")[0].slice(0, 140) || "#공구 게시물",
      influencerName: null,
      sourceUrl,
      thumbnailUrl: null,
      discountRate: null,
      buyUrl: null,
      startDate: null,
      endDate: null,
      status: null,
    }];
  });
}
