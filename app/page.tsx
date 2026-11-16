import { ShoppingBag } from "lucide-react";
import CollectedDeals from "@/components/CollectedDeals";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl pb-24">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <a href="/" className="text-2xl font-black tracking-tight text-brand">
              공구모음
            </a>
            <p className="text-xs text-gray-500">인플루언서 공동구매를 한곳에</p>
          </div>
        </div>
      </header>

      <section className="relative mx-5 mt-5 overflow-hidden rounded-3xl bg-brand text-white px-6 py-10 sm:px-10 sm:py-14">
        <p className="relative z-1 text-sm font-medium text-white">오늘의 공동구매</p>
        <h1 className="relative z-1 mt-2 text-3xl font-black leading-tight sm:text-5xl">
          놓치면 아쉬운 공구,
          <br />
          한눈에 모아보세요!
        </h1>
        <ShoppingBag aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-1 h-56 w-56 rotate-12 text-[#ffbf93]/45 sm:right-12 sm:h-72 sm:w-72" />
      </section>

      <CollectedDeals />
    </main>
  );
}
