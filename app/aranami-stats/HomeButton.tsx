import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
    >
      ← 홈으로
    </Link>
  );
}