import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "官公庁案件検索｜自分に合う、公的な仕事を探す", template: "%s｜官公庁案件検索" },
  description: "官公需情報ポータルの公式APIで取得した公的な調達案件を検索。IT・Web制作・業務効率化・AI関連の仕事と参加条件を、原典とともに確認できます。全国すべての案件の網羅は保証しません。",
  applicationName: "官公庁案件検索", robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f6fa", colorScheme: "light dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body><AppShell>{children}</AppShell></body></html>;
}
