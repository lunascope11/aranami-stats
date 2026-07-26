import Link from "next/link";
import { getAranamiMinecraftStats } from "../../../lib/aranami-minecraft";

function formatDuration(durationMs: number) {
  const totalMinutes = Math.floor(
    durationMs / 1000 / 60,
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return `${hours}시간 ${minutes}분`;
}

function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export default async function AranamiConcurrentStatsPage() {
  const stats = await getAranamiMinecraftStats();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← あらなみマイクラ 통계로
          </Link>

          <p className="mt-6 text-sm font-semibold text-emerald-400">
            Concurrent Broadcast Statistics
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            동시 방송 인원별 통계
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            정확히 N명이 동시에 방송하고 있었던 시간을
            집계합니다.
            같은 인원수 안에서는 정확히 어떤 멤버 조합이
            그 시간을 차지했는지도 확인할 수 있습니다.
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

        <section className="mb-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">
              최대 동시 방송
            </p>

            <p className="mt-2 text-2xl font-bold">
              {stats.maxConcurrentParticipants}명
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">
              방송 커버 시간
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatDuration(stats.coveredDurationMs)}
            </p>
          </div>
        </section>

        <div className="space-y-6">
          {stats.concurrentStats.map(
            (concurrentStat, index) => (
              <section
                key={concurrentStat.participantCount}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">
                      #{index + 1}
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      {concurrentStat.participantCount}명
                      동시 방송
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                      전체 방송 커버 시간의{" "}
                      {formatPercent(
                        concurrentStat.ratioOfCoveredDuration,
                      )}
                    </p>
                  </div>

                  <p className="text-2xl font-bold text-emerald-400">
                    {formatDuration(
                      concurrentStat.durationMs,
                    )}
                  </p>
                </div>

                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                    멤버 조합별 점유율
                  </h3>

                  <div className="space-y-2">
                    {concurrentStat.groups
                      .slice(0, 3)
                      .map(
                        (group, groupIndex) => (
                          <div
                            key={group.vtuberIds.join("|")}
                            className="flex flex-col gap-2 rounded-lg bg-zinc-950/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <span className="mr-3 text-sm text-zinc-500">
                                {groupIndex + 1}.
                              </span>

                              <span className="font-medium">
                                {group.vtuberNames.join(
                                  " + ",
                                )}
                              </span>
                            </div>

                            <div className="shrink-0 text-sm text-zinc-400">
                              <span className="text-zinc-200">
                                {formatDuration(
                                  group.durationMs,
                                )}
                              </span>

                              <span className="mx-2">
                                ·
                              </span>

                              <span>
                                {formatPercent(
                                  group.ratioWithinCount,
                                )}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                </div>

                {concurrentStat.groups.length > 3 && (
                  <div className="mt-4 text-right">
                    <Link
                      href={`/concurrent/${concurrentStat.participantCount}`}
                      className="text-sm font-semibold text-violet-400 hover:text-violet-300"
                    >
                      {concurrentStat.participantCount}명 조합 전체 보기 →
                    </Link>
                  </div>
                )}
              </section>
            ),
          )}
        </div>
      </div>
    </main>
  );
}