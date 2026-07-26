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

function formatDateTime(timeMs: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timeMs));
}

const LONG_SEGMENT_MS = 40 * 60 * 1000;

export default async function AranamiContinuousStatsPage() {
  const stats = await getAranamiMinecraftStats();

  const segments =
    stats.concurrentContinuousSegments;

  const groupedSegments = stats.concurrentStats
    .map((concurrentStat) => ({
      participantCount:
        concurrentStat.participantCount,

      segments:
        stats.concurrentContinuousSegments.filter(
          (segment) =>
            segment.participantCount ===
            concurrentStat.participantCount,
        ),
    }))
    .filter(
      (group) => group.segments.length > 0,
    );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <Link
            href="/concurrent"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← 동시 방송 누적 통계로
          </Link>

          <p className="mt-6 text-sm font-semibold text-emerald-400">
            Continuous Concurrent Broadcasts
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            동시 방송 연속 기록
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            같은 멤버 조합이 끊기지 않고 연속으로
            방송한 시간을 기준으로 정렬합니다.
          </p>
        </header>

        <section className="mb-10 rounded-xl border border-amber-900/60 bg-amber-950/20 p-5">
          <p className="text-base font-bold leading-6 text-zinc-400">
            7명 이상이 동시에 방송하면서
            40분 이상 연속 유지된 경우에는
            실제 시작 시각과 종료 시각을 함께 표시합니다.
          </p>
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

        <div className="space-y-8">
          {groupedSegments.map((group) => (
            <section
              key={group.participantCount}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="mb-5 border-b border-zinc-800 pb-4">
                <h2 className="text-2xl font-bold">
                  {group.participantCount}명 동시 방송
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  연속 유지시간 기준 순위
                </p>
              </div>

              <div className="space-y-3">
                {group.segments
                  .slice(0, 3)
                  .map(
                    (segment, index) => {
                      const isNotable =
                        segment.participantCount >= 7 &&
                        segment.durationMs >=
                        LONG_SEGMENT_MS

                      return (
                        <div
                          key={`${segment.startMs}-${segment.endMs}-${segment.vtuberIds.join("|")}`}
                          className="rounded-lg bg-zinc-950/70 p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm text-zinc-500">
                                #{index + 1}
                              </p>

                              <p className="mt-2 leading-7 text-zinc-300">
                                {segment.vtuberNames.join(
                                  " + ",
                                )}
                              </p>

                              {isNotable && (
                                <div className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3">
                                  <p className="text-sm font-semibold text-amber-300">
                                    장시간 대규모 동시 방송
                                  </p>

                                  <p className="mt-1 text-sm text-zinc-300">
                                    {formatDateTime(
                                      segment.startMs,
                                    )}
                                    {" ~ "}
                                    {formatDateTime(
                                      segment.endMs,
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 sm:text-right">
                              <p className="text-xl font-bold text-emerald-400">
                                {formatDuration(
                                  segment.durationMs,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
              </div>

              {group.segments.length > 3 && (
                <div className="mt-4 text-right">
                  <Link
                    href={`/continuous/${group.participantCount}`}
                    className="text-sm font-semibold text-violet-400 hover:text-violet-300"
                  >
                    {group.participantCount}명 연속 기록 전체 보기 →
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}