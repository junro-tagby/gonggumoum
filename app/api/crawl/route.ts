import { getFeed, isHealthy } from "@/lib/feed";

export async function GET() {
  const feed = await getFeed();
  return Response.json(feed, {
    headers: { "Cache-Control": isHealthy(feed) ? "public, s-maxage=60, stale-while-revalidate=120" : "no-store" },
  });
}
