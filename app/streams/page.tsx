import ManualWatchList from "./ManualWatchList";
import Link from "next/link";
import {
  getYouTubeFeed,
  YouTubeFeedItem,
} from "../../lib/youtube";
import { vtubers } from "../../data/vtubers";

function formatDate(value: string | undefined) {
  if (!value) {
    return "시간 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBroadcastDuration(
  startAt: string,
  endAt: string,
) {
  const durationMs =
    new Date(endAt).getTime() -
    new Date(startAt).getTime();

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "";
  }

  const totalMinutes = Math.floor(
    durationMs / (1000 * 60),
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

function getVtuberName(vtuberId: string) {
  return (
    vtubers.find((vtuber) => vtuber.id === vtuberId)?.name ??
    "알 수 없는 버튜버"
  );
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isWithinLastThreeDays(item: YouTubeFeedItem) {
  const itemTime =
    item.actualEndAt ??
    item.actualStartAt ??
    item.scheduledAt ??
    item.publishedAt;

  const timestamp = new Date(itemTime).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp >= Date.now() - THREE_DAYS_MS
  );
}

function StatusBadge({
  status,
}: {
  status: YouTubeFeedItem["status"];
}) {
  if (status === "live") {
    return (
      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
        LIVE
      </span>
    );
  }

  if (status === "upcoming") {
    return (
      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
        방송 예정
      </span>
    );
  }

  if (status === "ended") {
    return (
      <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-bold text-zinc-200">
        방송 종료
      </span>
    );
  }

  return (
    <span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-bold text-white">
      일반 영상
    </span>
  );
}

function FeedCard({ item }: { item: YouTubeFeedItem }) {
  const displayedTime =
    item.scheduledAt ?? item.actualStartAt ?? item.publishedAt;

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {item.thumbnail && (
        <a
          href={item.youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="block aspect-video overflow-hidden bg-zinc-800"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail}
            alt={`${item.title} 썸네일`}
            className="h-full w-full object-cover transition hover:scale-105"
          />
        </a>
      )}

      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />

            {item.status === "ended" &&
              item.actualStartAt &&
              item.actualEndAt && (
                <span className="text-xs font-semibold text-zinc-400">
                  {formatBroadcastDuration(
                    item.actualStartAt,
                    item.actualEndAt,
                  )}
                </span>
            )}
          </div>

          <time className="text-sm text-zinc-500">
            {formatDate(displayedTime)}
          </time>
        </div>

        <p className="text-sm text-violet-400">
          {getVtuberName(item.vtuberId)}
        </p>

        <h3 className="mt-1 line-clamp-2 text-xl font-bold">
          {item.title}
        </h3>

        {item.status === "live" &&
          item.concurrentViewers !== undefined && (
            <p className="mt-3 text-sm font-semibold text-red-400">
              현재 시청자 {item.concurrentViewers.toLocaleString()}명
            </p>
          )}

        <a
          href={item.youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
        >
          YouTube에서 보기
        </a>
      </div>
    </article>
  );
}

function FeedSection({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: YouTubeFeedItem[];
  emptyMessage: string;
}) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>

        <span className="text-sm text-zinc-500">
          {items.length}개
        </span>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export default async function StreamsPage() {
  let feed: YouTubeFeedItem[] = [];
  let errorMessage: string | null = null;

  try {
    feed = await getYouTubeFeed();
  } catch (error) {
    console.error(error);

    errorMessage =
      error instanceof Error
        ? error.message
        : "YouTube 정보를 가져오지 못했습니다.";
  }

  const liveStreams = feed.filter(
    (item) => item.status === "live",
  );

  const upcomingStreams = feed.filter(
    (item) => item.status === "upcoming",
  );

  const endedStreams = feed.filter(
    (item) =>
      item.status === "ended" &&
      isWithinLastThreeDays(item),
  );

  const regularVideos = feed.filter(
    (item) =>
      item.status === "video" &&
      isWithinLastThreeDays(item),
  );

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

          <h1 className="mt-4 text-4xl font-bold">
            방송 기록
          </h1>

          <p className="mt-3 text-zinc-400">
            등록한 버튜버의 실제 YouTube 방송과 영상을
            확인합니다.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-6">
            <p className="font-bold text-red-300">
              YouTube 정보를 가져오지 못했습니다.
            </p>

            <p className="mt-2 text-sm text-red-200">
              {errorMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            <FeedSection
              title="현재 방송 중"
              items={liveStreams}
              emptyMessage="현재 방송 중인 버튜버가 없습니다."
            />

            <FeedSection
              title="방송 예정"
              items={upcomingStreams}
              emptyMessage="현재 확인된 방송 일정이 없습니다."
            />

            <ManualWatchList />

            <FeedSection
              title="최근 종료된 방송"
              items={endedStreams}
              emptyMessage="최근 종료된 방송이 없습니다."
            />

            <FeedSection
              title="최근 일반 영상"
              items={regularVideos}
              emptyMessage="최근 일반 영상이 없습니다."
            />
          </div>
        )}
      </div>
    </main>
  );
}