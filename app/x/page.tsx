import Link from "next/link";
import { vtubers } from "../../data/vtubers";

export default function XPage() {
  const xVtubers = [...vtubers]
    .filter((vtuber) => vtuber.xUrl)
    .sort((a, b) =>
      a.reading.localeCompare(b.reading, "ja"),
    );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold text-violet-400">
            X RECORDS
          </p>

          <h1 className="text-4xl font-bold">
            X 기록
          </h1>

          <p className="mt-3 text-zinc-400">
            라이버를 선택하면 최근 X 게시물을 확인할 수 있습니다.
          </p>
        </header>

        <Link
          href="/"
          className="mb-8 inline-block text-sm text-zinc-400 hover:text-white"
        >
          ← 홈으로
        </Link>

        <div className="grid gap-4 sm:grid-cols-2">
          {xVtubers.map((vtuber) => (
            <Link
              key={vtuber.id}
              href={`/x/${vtuber.id}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-violet-500 hover:bg-zinc-800"
            >
              <p className="text-sm text-zinc-500">
                {vtuber.group}
              </p>

              <h2 className="mt-1 text-xl font-bold">
                {vtuber.name}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {vtuber.reading}
              </p>

              <p className="mt-4 text-sm font-semibold text-violet-400">
                최근 X 게시물 보기 →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}