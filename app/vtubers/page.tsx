import Image from "next/image";
import Link from "next/link";
import { vtubers } from "../../data/vtubers";
import { createClient } from "../../lib/supabase/server";

const japaneseCollator = new Intl.Collator("ja");

export default async function VtubersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const visibleVtubers = user
    ? [...vtubers].sort((a, b) =>
      japaneseCollator.compare(a.reading, b.reading),
    )
    : [];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← 홈으로
          </Link>

          <h1 className="mt-4 text-4xl font-bold">버튜버 명부</h1>

          <p className="mt-3 text-zinc-400">
            등록한 버튜버의 YouTube와 X 계정을 확인합니다.
          </p>
        </header>

        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">전체 명부</h2>

          <span className="text-sm text-zinc-500">
            {visibleVtubers.length}명 등록됨
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleVtubers.map((vtuber) => (
            <article
              key={vtuber.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className="text-sm text-zinc-500">{vtuber.group}</p>

              <Link
                href={`/vtubers/${vtuber.id}`}
                className="mt-1 block text-xl font-bold hover:text-violet-300"
              >
                {vtuber.name}
              </Link>

              <Link
                href={`/vtubers/${vtuber.id}`}
                className="mt-4 block w-fit"
              >
                <Image
                  src={vtuber.profileImage}
                  alt={`${vtuber.name} 프로필 사진`}
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-full object-cover"
                />
              </Link>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/vtubers/${vtuber.id}`}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600"
                >
                  Details
                </Link>
                <a
                  href={vtuber.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
                >
                  YouTube
                </a>

                <a
                  href={vtuber.xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-600"
                >
                  X
                </a>
                {vtuber.shopUrl && (
                  <a
                    href={vtuber.shopUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
                  >
                    Shop↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}