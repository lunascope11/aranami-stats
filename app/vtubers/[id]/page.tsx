import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vtubers } from "../../../data/vtubers";
import {
  getYouTubeFeed,
  type YouTubeFeedItem,
} from "../../../lib/youtube";

function renderTextWithStrike(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    const isStrikethrough =
      part.startsWith("**") && part.endsWith("**");

    if (isStrikethrough) {
      return (
        <span key={index} className="line-through">
          {part.slice(2, -2)}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

type VtuberPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return vtubers.map((vtuber) => ({
    id: vtuber.id,
  }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDisplayTime(item: YouTubeFeedItem) {
  return (
    item.scheduledAt ??
    item.actualStartAt ??
    item.publishedAt
  );
}

function StatusBadge({
  status,
}: {
  status: YouTubeFeedItem["status"];
}) {
  const labels = {
    live: "LIVE",
    upcoming: "방송 예정",
    ended: "방송 종료",
    video: "일반 영상",
  };

  const styles = {
    live: "bg-red-600 text-white",
    upcoming: "bg-blue-600 text-white",
    ended: "bg-zinc-700 text-zinc-200",
    video: "bg-violet-700 text-white",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function VideoCard({
  item,
}: {
  item: YouTubeFeedItem;
}) {
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
          <StatusBadge status={item.status} />

          <time className="text-sm text-zinc-500">
            {formatDate(getDisplayTime(item))}
          </time>
        </div>

        <h3 className="line-clamp-2 text-lg font-bold leading-snug">
          {item.title}
        </h3>

        {item.status === "live" &&
          item.concurrentViewers !== undefined && (
            <p className="mt-3 text-sm font-semibold text-red-400">
              현재 시청자{" "}
              {item.concurrentViewers.toLocaleString()}명
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

function VideoSection({
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
            <VideoCard key={item.id} item={item} />
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

export default async function VtuberPage({
  params,
}: VtuberPageProps) {
  const { id } = await params;

  const vtuber = vtubers.find(
    (candidate) => candidate.id === id,
  );

  if (!vtuber) {
    notFound();
  }

  let feed: YouTubeFeedItem[] = [];
  let errorMessage: string | null = null;

  try {
    const fullFeed = await getYouTubeFeed();

    feed = fullFeed.filter(
      (item) => item.vtuberId === vtuber.id,
    );
  } catch (error) {
    console.error(error);

    errorMessage =
      error instanceof Error
        ? error.message
        : "YouTube 정보를 가져오지 못했습니다.";
  }

  const liveItems = feed.filter(
    (item) => item.status === "live",
  );

  const upcomingItems = feed.filter(
    (item) => item.status === "upcoming",
  );

const threeDaysAgo =
  Date.now() - 3 * 24 * 60 * 60 * 1000;

const recentItems = feed
  .filter((item) => {
    if (
      item.status !== "ended" &&
      item.status !== "video"
    ) {
      return false;
    }

    const itemTime =
      item.actualEndAt ??
      item.actualStartAt ??
      item.scheduledAt ??
      item.publishedAt;

    return (
      new Date(itemTime).getTime() >= threeDaysAgo
    );
  })
  .slice(0, 8);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <Link
            href="/vtubers"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← 버튜버 명부
          </Link>
          
          <div className="mt-8">
            <Image
              src={vtuber.profileImage}
              alt={`${vtuber.name} 프로필 사진`}
              width={160}
              height={160}
              className="h-40 w-40 rounded-full object-cover"
            />

            <p className="mt-5 text-sm text-zinc-500">
              {vtuber.group}
            </p>

            <h1 className="mt-1 text-4xl font-bold">
              {vtuber.name}
            </h1>

            {vtuber.details && vtuber.details.length > 0 && (
              <dl className="mt-4 space-y-1 text-sm text-zinc-400">
                {vtuber.details.map((detail) => (
                  <div
                    key={`${detail.label}-${detail.value}`}
                    className="flex flex-wrap gap-x-2"
                  >
                    <dt className="font-semibold text-zinc-300">
                      {detail.label}
                    </dt>

                    <dd>{renderTextWithStrike(detail.value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={vtuber.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500"
            >
              YouTube 채널
            </a>

            <a
              href={vtuber.xUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-zinc-700 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-600"
            >
              X 계정
            </a>

            {vtuber.shopUrl && (
              <a
                href={vtuber.shopUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600"
              >
                공식 스토어↗
              </a>
            )}

            <a
              href={vtuber.wiki}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-600"
            >
              비공식 위키↗
            </a>
          </div>
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
            <VideoSection
              title="현재 방송 중"
              items={liveItems}
              emptyMessage="현재 방송 중이 아닙니다."
            />

            <VideoSection
              title="방송 예정"
              items={upcomingItems}
              emptyMessage="현재 확인된 방송 일정이 없습니다."
            />

            <VideoSection
              title="최근 방송과 영상"
              items={recentItems}
              emptyMessage="최근 영상이 없습니다."
            />
          </div>
        )}
      </div>
    </main>
  );
}