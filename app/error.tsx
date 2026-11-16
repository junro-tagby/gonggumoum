"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <p role="alert">수집 목록을 불러오지 못했습니다.</p>
      <button type="button" onClick={reset} className="mt-4 min-h-10 rounded-lg bg-action px-4 text-sm text-white hover:bg-action-hover">
        다시 시도
      </button>
    </main>
  );
}
