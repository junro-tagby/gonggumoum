/** 원본 응답을 캐시하는 시간(초) */
export const SOURCE_REVALIDATE_SECONDS = 300;

/** 수집 요청임을 밝히는 User-Agent. 판매처가 연락할 수 있도록 운영 환경에는 CRAWLER_CONTACT_URL을 설정한다. */
export function crawlerUserAgent() {
  const contact = process.env.CRAWLER_CONTACT_URL;
  return contact ? `GongguMoumBot/1.0 (+${contact})` : "GongguMoumBot/1.0";
}

export class SourceError extends Error {
  name = "SourceError";
}

/** 원본 페이지나 API를 읽는다. 리다이렉트는 따라가지 않고, 실패하면 원본 호스트와 상태 코드를 담은 SourceError를 던진다. */
export async function fetchSource(url: URL | string, { headers, timeoutMs = 8000 }: { headers?: Record<string, string>; timeoutMs?: number } = {}) {
  const host = new URL(url).host;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": crawlerUserAgent(), ...headers },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: SOURCE_REVALIDATE_SECONDS },
    });
  } catch (error) {
    throw new SourceError(`${host} request failed`, { cause: error });
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new SourceError(`${host} responded ${response.status}`);
  }
  return response;
}

/** 자격 증명이 없는 https 링크만 통과시킨다. 화면에 그대로 링크로 쓰이므로 javascript: 같은 값을 막는다. */
export function httpsLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
