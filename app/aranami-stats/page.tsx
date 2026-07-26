import StatsNoticeModal from "./StatsNoticeModal";
import Link from "next/link";
import { getAranamiMinecraftStats } from "../../lib/aranami-minecraft";

function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatDuration(durationMs: number) {
  const totalMinutes = Math.floor(durationMs / 1000 / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return `${hours}시간 ${minutes}분`;
}

export default async function AranamiStatsPage() {
  const stats = await getAranamiMinecraftStats();

  const topVtubers = stats.byVtuber.slice(0, 3);
  const topPairs = stats.pairOverlaps.slice(0, 3);

  const topTimeInvestments = [
    ...stats.investmentStats,
  ]
    .sort(
      (a, b) =>
        b.timeInvestmentRatio -
        a.timeInvestmentRatio,
    )
    .slice(0, 3);

  const topSlotInvestments = [
    ...stats.investmentStats,
  ]
    .sort(
      (a, b) =>
        b.slotInvestmentRatio -
        a.slotInvestmentRatio,
    )
    .slice(0, 3);

  const topConcurrentStats =
    stats.concurrentStats.slice(0, 3);

  const topContinuousSegments =
    stats.concurrentContinuousSegments.slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <StatsNoticeModal />

      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold text-emerald-400">
            Minecraft Event Statistics
          </p>

          <h1 className="text-3xl font-bold">
            あらなみマイクラ 통계
          </h1>
        </header>

        {/* 전체 요약 */}
        <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="총 방송"
            value={`${stats.totalStreams}회`}
          />

          <StatCard
            label="방송시간 총합"
            value={formatDuration(
              stats.totalBroadcastDurationMs,
            )}
          />

          <StatCard
            label="방송 커버 시간"
            value={formatDuration(
              stats.coveredDurationMs,
            )}
          />

          <StatCard
            label="최대 동시 방송"
            value={`${stats.maxConcurrentParticipants}명`}
          />
        </section>

        <section className="mb-12 rounded-xl border border-amber-900/60 bg-amber-950/20 p-5">
          <h2 className="mb-2 text-lg font-semibold text-amber-300">
            ※ 통계 이용 시 주의사항
          </h2>

          <div className="space-y-1 text-base leading-6 text-zinc-400">
            <p>
              이 통계는 YouTube 방송 데이터를 기준으로 계산됩니다.
            </p>

            <p>
              1. 방송 커버 시간은 참가자 중 적어도 한 명이
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

        {/* 라이버 방송시간 TOP 3 */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              라이버별 방송시간
            </h2>

            <Link
              href="/aranami-vtubers"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              라이버별 전체 순위 보기 →
            </Link>
          </div>

          <div className="space-y-4">
            {topVtubers.map((vtuber, index) => (
              <div
                key={vtuber.vtuberId}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-500">
                      #{index + 1}
                    </p>

                    <h3 className="text-xl font-bold">
                      {vtuber.vtuberName}
                    </h3>

                    {vtuber.soloDurationMs !== undefined &&
                      vtuber.soloRatio !== undefined && (
                        <span className="text-sm font-medium text-zinc-400">
                          혼자{" "}
                          {formatDuration(
                            vtuber.soloDurationMs,
                          )}{" "}
                          ·{" "}
                          {formatPercent(
                            vtuber.soloRatio,
                          )}
                        </span>
                      )}
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-400">
                      {formatDuration(
                        vtuber.totalDurationMs,
                      )}
                    </p>

                    <p className="text-sm text-zinc-400">
                      {vtuber.streamCount}회 · 평균{" "}
                      {formatDuration(
                        vtuber.averageDurationMs,
                      )}
                    </p>
                  </div>
                </div>

                {vtuber.overlaps.length > 0 && (
                  <div className="mt-5 border-t border-zinc-800 pt-4">
                    <p className="mb-3 text-sm font-semibold text-zinc-300">
                      같이 방송한 시간
                    </p>

                    <div className="space-y-2">
                      {vtuber.overlaps
                        .slice(0, 3)
                        .map((overlap, overlapIndex) => (
                          <div
                            key={overlap.vtuberId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-zinc-300">
                              {overlapIndex + 1}.{" "}
                              {overlap.vtuberName}
                            </span>

                            <span className="text-zinc-400">
                              {formatDuration(
                                overlap.overlapMs,
                              )}{" "}
                              ·{" "}
                              {formatPercent(
                                overlap.overlapRatio,
                              )}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 라이버별 방송 투자량 TOP 3 */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                라이버별 방송 투자량
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                개인 전체 방송 대비 あらなみマイクラ 투자율 TOP 3
              </p>
            </div>

            <Link
              href="/investment"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              방송 투자량 전체 순위 보기 →
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* 시간 투자율 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-lg font-bold">
                시간 투자율 TOP 3
              </h3>

              <div className="space-y-3">
                {topTimeInvestments.map(
                  (vtuber, index) => (
                    <div
                      key={vtuber.vtuberId}
                      className="flex items-center justify-between gap-4 rounded-lg bg-zinc-950/60 p-4"
                    >
                      <div>
                        <p className="text-sm text-zinc-500">
                          #{index + 1}
                        </p>

                        <p className="font-semibold">
                          {vtuber.vtuberName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-emerald-400">
                          {formatPercent(
                            vtuber.timeInvestmentRatio,
                          )}
                        </p>

                        <p className="text-sm text-zinc-500">
                          {formatDuration(
                            vtuber.aranamiDurationMs,
                          )}
                          {" / "}
                          {formatDuration(
                            vtuber.allBroadcastDurationMs,
                          )}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* 枠 투자율 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-lg font-bold">
                枠 투자율 TOP 3
              </h3>

              <div className="space-y-3">
                {topSlotInvestments.map(
                  (vtuber, index) => (
                    <div
                      key={vtuber.vtuberId}
                      className="flex items-center justify-between gap-4 rounded-lg bg-zinc-950/60 p-4"
                    >
                      <div>
                        <p className="text-sm text-zinc-500">
                          #{index + 1}
                        </p>

                        <p className="font-semibold">
                          {vtuber.vtuberName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-emerald-400">
                          {formatPercent(
                            vtuber.slotInvestmentRatio,
                          )}
                        </p>

                        <p className="text-sm text-zinc-500">
                          {vtuber.aranamiStreamCount}枠
                          {" / "}
                          {vtuber.allBroadcastStreamCount}枠
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 동시 방송 페어 TOP 3 */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              동시 방송 페어
            </h2>

            <Link
              href="/pairs"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              동시 방송 페어 전체 순위 보기 →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {topPairs.length === 0 ? (
              <p className="p-5 text-zinc-400">
                겹친 방송이 없습니다.
              </p>
            ) : (
              topPairs.map((pair, index) => (
                <div
                  key={`${pair.vtuberAId}-${pair.vtuberBId}`}
                  className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 last:border-b-0"
                >
                  <div>
                    <span className="mr-3 text-zinc-500">
                      #{index + 1}
                    </span>

                    <span className="font-semibold">
                      {pair.vtuberAName}
                    </span>

                    <span className="mx-2 text-zinc-500">
                      ↔
                    </span>

                    <span className="font-semibold">
                      {pair.vtuberBName}
                    </span>
                  </div>

                  <span className="font-semibold text-emerald-400">
                    {formatDuration(pair.overlapMs)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 동시 방송 누적 TOP 3 */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                동시 방송 누적
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                정확히 같은 인원수가 동시에 방송한 누적 시간
              </p>
            </div>

            <Link
              href="/concurrent"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              동시 방송 누적 전체 보기 →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {topConcurrentStats.map(
              (concurrentStat, index) => (
                <div
                  key={concurrentStat.participantCount}
                  className="flex flex-col gap-2 border-b border-zinc-800 bg-zinc-900 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="mr-3 text-zinc-500">
                      #{index + 1}
                    </span>

                    <span className="font-semibold">
                      {concurrentStat.participantCount}명
                      동시 방송
                    </span>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-semibold text-emerald-400">
                      {formatDuration(
                        concurrentStat.durationMs,
                      )}
                    </p>

                    <p className="text-sm text-zinc-500">
                      전체 방송 커버 시간의{" "}
                      {formatPercent(
                        concurrentStat.ratioOfCoveredDuration,
                      )}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        {/* 동시 방송 연속 TOP 3 */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                동시 방송 연속
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                같은 멤버 조합이 끊기지 않고 유지된 시간
              </p>
            </div>

            <Link
              href="/continuous"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              동시 방송 연속 전체 보기 →
            </Link>
          </div>

          <div className="space-y-4">
            {topContinuousSegments.map(
              (segment, index) => (
                <div
                  key={`${segment.startMs}-${segment.endMs}-${segment.vtuberIds.join("|")}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-500">
                        #{index + 1}
                      </p>

                      <p className="mt-1 font-semibold">
                        {segment.participantCount}명
                        동시 방송
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {segment.vtuberNames.join(
                          " + ",
                        )}
                      </p>
                    </div>

                    <p className="shrink-0 text-xl font-bold text-emerald-400">
                      {formatDuration(
                        segment.durationMs,
                      )}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      </div >
    </main >
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-2 text-sm text-zinc-400">
        {label}
      </p>

      <p className="text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}