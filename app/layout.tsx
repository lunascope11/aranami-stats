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

        <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-500">
          <span>Aranami Stats v{packageJson.version}</span>

          <span className="mx-2">·</span>

          <Link
            href="/changelog"
            className="transition hover:text-zinc-300"
          >
            업데이트 내역
          </Link>
        </footer>
      </body>
    </html>
  );
}
