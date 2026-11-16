// 공구 제목으로 카테고리를 정한다. 위에서부터 처음 맞는 카테고리를 쓰고, 없으면 OTHER_CATEGORY.
export const CATEGORIES = [
  { label: "육아", pattern: /유아|아기|키즈|기저귀|젖병|유모차|장난감/i },
  { label: "뷰티", pattern: /화장품|스킨케어|미스트|샴푸|트리트먼트|제모기|고데기|드라이기|크림|세럼/i },
  { label: "식품", pattern: /초코파이|젤리|아르기닌|건강기능식품|그래놀라|커피|과자|오다다 티/i },
  { label: "패션", pattern: /니트|의류|팬츠|후드|셋업|슬리퍼|부츠|가방|캐리어|꼼데|어그/i },
  { label: "리빙", pattern: /카본매트|토퍼|밧드|밀폐용기|실리콘 컵|히터|웨건|카트|쉐이크보드|주방|수납/i },
] as const;

export const OTHER_CATEGORY = "기타";

export const CATEGORY_LABELS = [...CATEGORIES.map(({ label }) => label), OTHER_CATEGORY];

export function categorize(title: string) {
  return CATEGORIES.find(({ pattern }) => pattern.test(title))?.label ?? OTHER_CATEGORY;
}
