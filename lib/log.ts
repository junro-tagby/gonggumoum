// 호스팅 로그에서 검색할 수 있도록 한 줄짜리 JSON으로 남긴다. 토큰 같은 비밀 값은 넣지 않는다.
export function logWarning(event: string, fields: Record<string, unknown> = {}) {
  const entries = Object.entries(fields).map(([key, value]) => [key, value instanceof Error ? describe(value) : value]);
  console.warn(JSON.stringify({ level: "warn", event, time: new Date().toISOString(), ...Object.fromEntries(entries) }));
}

function describe(error: Error): string {
  return error.cause instanceof Error ? `${error.name}: ${error.message} (cause: ${describe(error.cause)})` : `${error.name}: ${error.message}`;
}
