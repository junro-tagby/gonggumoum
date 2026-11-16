import { crawlInpock, crawlInstagram, enrichPurchaseDiscounts } from "@/lib/crawl";

let inFlight: ReturnType<typeof collect> | undefined;

export async function GET() {
  inFlight ??= collect().finally(() => { inFlight = undefined; });
  const feed = await inFlight;
  const healthy = feed.failedProfiles.length === 0 && feed.instagramStatus !== "unavailable";
  return Response.json(feed, {
    headers: { "Cache-Control": healthy ? "public, s-maxage=60, stale-while-revalidate=120" : "no-store" },
  });
}

async function collect() {
  const handles = [...new Set((process.env.INPOCK_HANDLES ?? "angelique,masya,chienj84").split(",").map((handle) => handle.trim()).filter(Boolean))].slice(0, 10);
  const [inpock, instagram] = await Promise.all([
    Promise.allSettled(handles.map(crawlInpock)),
    Promise.allSettled([crawlInstagram()]).then(([result]) => result),
  ]);
  return {
    inpock: await enrichPurchaseDiscounts(inpock.flatMap((result) => result.status === "fulfilled" ? result.value : [])),
    failedProfiles: handles.filter((_, index) => inpock[index].status === "rejected"),
    instagram: instagram.status === "fulfilled" ? instagram.value ?? [] : [],
    instagramStatus: instagram.status === "rejected" ? "unavailable" : instagram.value === null ? "unconfigured" : "ready",
  };
}
