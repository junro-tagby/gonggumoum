import { describe, expect, it } from "vitest";
import { InpockFormatError, parseInpock } from "./inpock";

const now = Date.parse("2026-11-16T03:00:00Z");

// 인포크 페이지 구조: 블록 데이터는 __NEXT_DATA__에 있고, 화면에 그려진 블록만 data-preview-block-id를 가진다.
function page(blocks: object[], hiddenIds: number[] = []) {
  const data = { props: { pageProps: { blocks } } };
  const rendered = blocks
    .map((block) => (block as { id: number }).id)
    .filter((id) => !hiddenIds.includes(id))
    .map((id) => `<div data-preview-block-id="${id}"></div>`)
    .join("");
  return `<html><body>${rendered}<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}

const text = (id: number, title: string) => ({ id, block_type: "text", title });
const link = (id: number, title: string, url: string, extra: object = {}) => ({ id, block_type: "link", title, url, ...extra });

describe("parseInpock", () => {
  it("reads only visible links under a group-buy section", () => {
    const html = page([
      text(1, "일상 링크"),
      link(2, "유튜브", "https://youtube.com/@a"),
      text(3, "진행중 공구"),
      link(4, "  니트   셋업 ", "https://heytem.kr/Detail/abc", { image: "images/2026/a.webp" }),
      link(5, "숨긴 공구", "https://heytem.kr/Detail/hidden"),
      link(6, "오픈채팅", "https://open.kakao.com/o/xyz"),
      link(7, "http 링크", "http://heytem.kr/Detail/insecure"),
      link(8, "스크립트", "javascript:alert(1)"),
    ], [5]);

    expect(parseInpock(html, "someone", now, {})).toEqual([{
      id: "inpock:someone:4",
      title: "니트 셋업",
      influencerName: "someone",
      sourceUrl: "https://link.inpock.co.kr/someone",
      thumbnailUrl: "https://d13k46lqgoj3d6.cloudfront.net/2026/a.webp",
      discountRate: null,
      buyUrl: "https://heytem.kr/Detail/abc",
      startDate: null,
      endDate: null,
      status: "OPEN",
    }]);
  });

  it("derives status from open dates and drops finished calendar events", () => {
    const html = page([
      text(1, "공동구매 일정"),
      link(2, "예정", "https://heytem.kr/Detail/a", { open_at: "2026-11-20T00:00:00Z", open_until: "2026-11-25T00:00:00Z" }),
      link(3, "종료", "https://heytem.kr/Detail/b", { open_at: "2026-11-01T00:00:00Z", open_until: "2026-11-16T03:00:00Z" }),
      {
        id: 4,
        block_type: "calendar",
        schedule_list: [
          { id: 10, title: "지난 일정", url: null, start_at: "2026-11-01T00:00:00Z", end_at: "2026-11-02T00:00:00Z" },
          { id: 11, title: "다음 일정", url: "https://example.com/next", start_at: "2026-11-17T00:00:00Z", end_at: "2026-11-18T00:00:00Z" },
        ],
      },
    ]);

    expect(parseInpock(html, "someone", now, {}).map(({ id, status, buyUrl }) => ({ id, status, buyUrl }))).toEqual([
      { id: "inpock:someone:2", status: "PENDING", buyUrl: "https://heytem.kr/Detail/a" },
      { id: "inpock:someone:3", status: "CLOSED", buyUrl: "https://heytem.kr/Detail/b" },
      { id: "inpock:someone:calendar:11", status: "PENDING", buyUrl: "https://example.com/next" },
    ]);
  });

  it("applies the profile's path filter and calendar link fallback", () => {
    const html = page([
      text(1, "공구"),
      link(2, "알로 기모 2종 셋업 공구", "https://heytem.kr/Detail/alo"),
      link(3, "이벤트 안내", "https://heytem.kr/Event/1"),
      {
        id: 4,
        block_type: "calendar",
        schedule_list: [
          { id: 20, title: "ALO 트레이닝 팬츠&후드집업 오픈", url: null, start_at: "2026-11-15T00:00:00Z", end_at: "2026-11-18T00:00:00Z" },
          { id: 21, title: "ALO 트레이닝 팬츠&후드집업 2차", url: null, start_at: "2026-11-20T00:00:00Z", end_at: "2026-11-22T00:00:00Z" },
        ],
      },
    ]);
    const rule = {
      buyPathPrefix: "/Detail/",
      calendarLinkFallbacks: [{ calendarTitlePrefix: "ALO 트레이닝 팬츠&후드집업", listingTitleIncludes: "알로 기모 2종 셋업" }],
    };

    expect(parseInpock(html, "someone", now, rule).map(({ id, buyUrl }) => ({ id, buyUrl }))).toEqual([
      { id: "inpock:someone:2", buyUrl: "https://heytem.kr/Detail/alo" },
      { id: "inpock:someone:calendar:20", buyUrl: "https://heytem.kr/Detail/alo" },
      // 오픈 전 일정에는 링크를 붙이지 않는다.
      { id: "inpock:someone:calendar:21", buyUrl: null },
    ]);
  });

  it("reports a format error when the page structure changes", () => {
    expect(() => parseInpock("<html><body>점검 중</body></html>", "someone", now)).toThrow(InpockFormatError);
    expect(() => parseInpock(`<script id="__NEXT_DATA__">{"props":{}}</script>`, "someone", now)).toThrow(/blocks/);
  });
});
