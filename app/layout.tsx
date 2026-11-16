import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공구모음 | 인플루언서 공동구매",
  description: "인플루언서 공동구매를 한곳에서 찾아보세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
