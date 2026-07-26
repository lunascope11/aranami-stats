import Link from "next/link";
import { getAranamiMinecraftStats } from "../../../lib/aranami-minecraft";

function formatDuration(durationMs: number) {
  const totalMinutes = Math.floor(
    durationMs / 1000 / 60,
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return `${hours}시간 ${minutes}분`;
}

function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export default async function AranamiInvestmentPage() {
  const stats =
    await getAranamiMinecraftStats();

  const timeInvestmentRanking = [
    ...stats.investmentStats,
  ].sort(
    (a, b) =>
      b.timeInvestmentRatio -
      a.timeInvestmentRatio,
  );

  const slotInvestmentRanking = [
    ...stats.investmentStats,
  ].sort(
    (a, b) =>
      b.slotInvestmentRatio -
      a.slotInvestmentRatio,
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← あらなみマイクラ 통계
          </Link>

          <p className="mt-6 text-sm font-semibold text-emerald-400">
            Broadcast Investment Statistics
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            라이버별 방송 투자량
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            YouTube에서 확인된 あらなみマイクラ 방송을 기준으로,
            각 라이버가 전체 방송시간과 방송 횟수에서
            차지하는 비율을 비교합니다.
          </p>
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

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 시간 투자율 순위 */}
          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-bold">
                시간 투자율 순위
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                6월 7일 이후 개인 전체 방송시간 중
                あらなみマイクラ가 차지한 비율
              </p>
            </div>

            <div className="space-y-3">
              {timeInvestmentRanking.map(
                (vtuber, index) => (
                  <article
                    key={vtuber.vtuberId}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-violet-400">
                          #{index + 1}
                        </p>

                        <h3 className="mt-1 font-bold">
                          {vtuber.vtuberName}
                        </h3>
                      </div>

                      <p className="text-xl font-bold text-emerald-400">
                        {formatPercent(
                          vtuber.timeInvestmentRatio,
                        )}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-500">
                          전체 방송
                        </span>

                        <span className="text-zinc-300">
                          {formatDuration(
                            vtuber.allBroadcastDurationMs,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-500">
                          あらなみ
                        </span>

                        <span className="font-semibold text-emerald-400">
                          {formatDuration(
                            vtuber.aranamiDurationMs,
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>

          {/* 枠 투자율 순위 */}
          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-bold">
                枠 투자율 순위
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                6월 7일 이후 개인 전체 방송 枠 중
                あらなみマイクラ가 차지한 비율
              </p>
            </div>

            <div className="space-y-3">
              {slotInvestmentRanking.map(
                (vtuber, index) => (
                  <article
                    key={vtuber.vtuberId}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-violet-400">
                          #{index + 1}
                        </p>

                        <h3 className="mt-1 font-bold">
                          {vtuber.vtuberName}
                        </h3>
                      </div>

                      <p className="text-xl font-bold text-emerald-400">
                        {formatPercent(
                          vtuber.slotInvestmentRatio,
                        )}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-500">
                          전체 방송
                        </span>

                        <span className="text-zinc-300">
                          {vtuber.allBroadcastStreamCount}枠
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-500">
                          あらなみ
                        </span>

                        <span className="font-semibold text-emerald-400">
                          {vtuber.aranamiStreamCount}枠
                        </span>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}