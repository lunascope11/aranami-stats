import Link from "next/link";
import packageJson from "../package.json";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aranami Stats",
  description: "Aranami Minecraft stream statistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <div className="min-h-screen">
          {children}
        </div>

        <footer className="border-t border-zinc-800 text-center text-sm text-zinc-500">
          {/* 버전 / 업데이트 내역 */}
          <div className="px-6 py-6">
            <span>
              Aranami Stats v{packageJson.version}
            </span>

            <span className="mx-2">·</span>

            <Link
              href="/changelog"
              className="transition hover:text-zinc-300"
            >
              업데이트 내역
            </Link>
          </div>

          {/* 사이트 안내 */}
          <div className="border-t border-zinc-800 px-6 py-4">
            <p className="text-xs font-bold tracking-[0.25em] text-zinc-600">
              본 사이트는 팬이 만든 비공식 팬 사이트로서, 니지산지 라이버 및 애니컬러 주식회사와는 일절 관계가 없습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
