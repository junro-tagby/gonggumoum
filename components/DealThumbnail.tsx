import { ShoppingBag } from "lucide-react";

/** 원본 썸네일을 채우고, 없으면 쇼핑백 아이콘을 보여준다. 부모는 position과 크기를 정해야 한다. */
export default function DealThumbnail({ url }: { url: string | null }) {
  return url
    // eslint-disable-next-line @next/next/no-img-element -- 외부 판매처 이미지를 그대로 보여주며, 이미지 최적화 서버를 거치지 않는다.
    ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
    : <div className="grid h-full place-items-center text-brand"><ShoppingBag size={28} aria-hidden="true" /></div>;
}
