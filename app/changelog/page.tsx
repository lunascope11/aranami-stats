import Link from "next/link";
import { changelog } from "../../data/changelog";

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← 홈으로
          </Link>

          <h1 className="mt-6 text-3xl font-bold">
            업데이트 내역
          </h1>

          <p className="mt-2 text-zinc-400">
            Aranami Stats의 버전별 변경 사항입니다.
          </p>
        </header>

        <div className="space-y-8">
          {changelog.map((entry) => (
            <section
              key={entry.version}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-xl font-bold text-zinc-100">
                  v{entry.version}
                </h2>

                <span className="text-sm text-zinc-500">
                  {entry.date}
                </span>
              </div>

              <h3 className="mt-2 font-semibold text-violet-300">
                {entry.title}
              </h3>

              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {entry.changes.map((change) => (
                  <li key={change}>
                    • {change}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}