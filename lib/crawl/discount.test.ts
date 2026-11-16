import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectedDeal } from "@/lib/types";
import { displayedDiscount, enrichPurchaseDiscounts, isDiscountPage } from "./discount";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("displayedDiscount", () => {
  it("returns the single unconditional rate shown on the page", () => {
    expect(displayedDiscount(`<div class="pdt_price">39,000원 <b>30%</b></div>`)).toBe(30);
    expect(displayedDiscount(`
      <div class="pdt_price" style="display: none">50%</div>
      <div class="pdt_price">30%</div>
      <div class="prod-info-price">카드 결제 시 최대 45%</div>`)).toBe(30);
  });

  it("returns null when the rate is ambiguous", () => {
    expect(displayedDiscount(`<div class="pdt_price">30%</div><div class="prod-info-price">20%</div>`)).toBeNull();
    expect(displayedDiscount(`<div class="pdt_price">10~30%</div>`)).toBeNull();
  });
});

describe("isDiscountPage", () => {
  it.each([
    ["https://smartstore.naver.com/decor-art/products/13862551879", true],
    ["http://smartstore.naver.com/decor-art/products/13862551879", false],
    ["https://smartstore.naver.com:8443/decor-art/products/13862551879", false],
    ["https://smartstore.naver.com.evil.example/decor-art/products/1", false],
    ["https://smartstore.naver.com/decor-art", false],
    ["https://kissme283.shop.blogpay.co.kr/v/g/dVofxB", true],
    ["https://other.shop.blogpay.co.kr/v/g/dVofxB", false],
  ])("%s → %s", (url, expected) => {
    expect(isDiscountPage(new URL(url))).toBe(expected);
  });
});

function deal(id: string, buyUrl: string, status: CollectedDeal["status"] = "OPEN"): CollectedDeal {
  return { id, title: id, influencerName: "a", sourceUrl: "https://link.inpock.co.kr/a", thumbnailUrl: null, discountRate: null, buyUrl, startDate: null, endDate: null, status };
}

const html = (body: string) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

describe("enrichPurchaseDiscounts", () => {
  it("fills rates within the time budget and leaves slow or unsafe pages null", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", (input: URL, init: RequestInit) => {
      requested.push(input.href);
      switch (input.href) {
        case "https://heytem.kr/Detail/fast":
          return Promise.resolve(html(`<div class="pdt_price">25%</div>`));
        case "https://smartstore.naver.com/decor-art/products/13862551879":
          return Promise.resolve(html(`<div class="pdt_price">40%</div>`));
        case "https://heytem.kr/Detail/redirect":
          return Promise.resolve(new Response(null, { status: 302, headers: { location: "https://evil.example/Detail/x" } }));
        default:
          // 응답하지 않는 판매처: 요청이 중단될 때까지 기다린다.
          return new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason)));
      }
    });

    const started = Date.now();
    const result = await enrichPurchaseDiscounts([
      deal("fast", "https://heytem.kr/Detail/fast"),
      deal("override", "https://mkt.shopping.naver.com/link/6af1795ee9f22e2e58bf018d"),
      deal("redirect", "https://heytem.kr/Detail/redirect"),
      deal("slow", "https://heytem.kr/Detail/slow"),
      deal("pending", "https://heytem.kr/Detail/pending", "PENDING"),
    ], { budgetMs: 200 });

    expect(Date.now() - started).toBeLessThan(2000);
    expect(Object.fromEntries(result.map((item) => [item.id, item.discountRate]))).toEqual({
      fast: 25, override: 40, redirect: null, slow: null, pending: null,
    });
    expect(requested).not.toContain("https://evil.example/Detail/x");
    expect(requested).not.toContain("https://heytem.kr/Detail/pending");
  });
});
