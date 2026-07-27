import HomeButton from "../HomeButton";
import Link from "next/link";
import { getAranamiMinecraftStats } from "../../../lib/aranami-minecraft";

function formatDuration(durationMs: number) {
  const totalMinutes = Math.floor(
    durationMs / 1000 / 60,
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return `${hours}시간 ${minutes}분`;
}

export default async function AranamiPairsPage() {
  const stats =
    await getAranamiMinecraftStats();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              ← あらなみマイクラ 통계
            </Link>

            <HomeButton />
          </div>

          <h1 className="mt-4 text-3xl font-bold">
            동시 방송 페어
          </h1>
        </header>

        <section className="mb-12 rounded-xl border border-amber-900/60 bg-amber-950/20 p-5">
          <h2 className="mb-2 text-lg font-semibold text-amber-300">
            ※ 통계 이용 시 주의사항
          </h2>

          <div className="space-y-1 text-base leading-6 text-zinc-400">
            <p>
              이 통계는 YouTube 방송 데이터를 기준으로 계산됩니다.
            </p>

            <p>
              1. 실제 진행 시간은 참가자 중 적어도 한 명이
              あらなみマイクラ 방송을 하고 있었던 시간이며,
              실제 서버 가동 시간이나 플레이 시간을 의미하지 않습니다.
            </p>

            <p>
              2. 단독 방송 시간은 다른 참가자의 방송과 겹치지 않은 시간입니다.
              방송을 켜지 않고 서버에 접속해 있던 참가자는 반영되지 않습니다.
            </p>

            <p>
              3. 방송 제목과 YouTube에서 확인 가능한 데이터를 기준으로 집계하므로
              일부 방송이 누락될 수 있습니다.
            </p>

            <p>
              4. 동시 방송 페어 시간은 두 참가자의 방송이 동시에 켜져있는지 유무를 바탕으로 집계했습니다.
              따라서 동시 방송 페어 시간동안 두 참가자가 각자 행동을 하고 있더라도 이는 통계에 반영되지 않습니다.
            </p>
          </div>
        </section>

        <div className="space-y-3">
          {stats.pairOverlaps.map(
            (pair, index) => (
              <article
                key={`${pair.vtuberAId}-${pair.vtuberBId}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div>
                  <p className="text-sm font-semibold text-violet-400">
                    #{index + 1}
                  </p>

                  <h2 className="mt-1 font-semibold">
                    {pair.vtuberAName}
                    <span className="mx-2 text-zinc-500">
                      ↔
                    </span>
                    {pair.vtuberBName}
                  </h2>
                </div>

                <p className="font-bold">
                  {formatDuration(
                    pair.overlapMs,
                  )}
                </p>
              </article>
            ),
          )}
        </div>
      </div>
    </main>
  );
}