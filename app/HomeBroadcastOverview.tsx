"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { vtubers } from "../data/vtubers";
import { createClient } from "@/lib/supabase/client";

type ManualVideoStatus =
  | "live"
  | "upcoming"
  | "ended"
  | "video";

type ManualVideo = {
  id: string;
  title: string;
  channelTitle: string;
  status: ManualVideoStatus;
  publishedAt: string;
  scheduledAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  youtubeUrl: string;
};

type LiveStreamStatus =
  | "planned"
  | "confirmed"
  | "cancelled";

type LiveStreamPlan = {
  id: string;
  vtuberIds?: string[];
  vtuberId?: string;
  customVtuberName?: string;
  title?: string;
  scheduledAt?: string;
  status?: LiveStreamStatus;
  youtubeUrl?: string;
};

type HomeBroadcastItem = {
  id: string;
  ownerName: string;
  title: string;
  status: "live" | "upcoming";
  scheduledAt?: string;
  youtubeUrl?: string;
};

const MANUAL_STORAGE_KEY =
  "manual-youtube-watch-list";

const PLAN_STORAGE_KEY =
  "vtuber-live-stream-plans";

function readStoredArray<T>(key: string): T[] {
  const savedValue = localStorage.getItem(key);

  if (!savedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(savedValue);

    return Array.isArray(parsedValue)
      ? (parsedValue as T[])
      : [];
  } catch (error) {
    console.error(
      `${key} 데이터를 읽지 못했습니다.`,
      error,
    );

    return [];
  }
}

function formatDate(value?: string) {
  if (!value) {
    return "시간 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTimestamp(value?: string) {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

function getManualDisplayTime(item: ManualVideo) {
  return (
    item.scheduledAt ??
    item.actualStartAt ??
    item.publishedAt
  );
}

function getPlanOwnerName(
  plan: LiveStreamPlan,
) {
  const vtuberIds = Array.isArray(
    plan.vtuberIds,
  )
    ? plan.vtuberIds
    : plan.vtuberId
      ? [plan.vtuberId]
      : [];

  const names = vtuberIds
    .map(
      (vtuberId) =>
        vtubers.find(
          (vtuber) =>
            vtuber.id === vtuberId,
        )?.name,
    )
    .filter(
      (name): name is string =>
        typeof name === "string",
    );

  const customVtuberName =
    plan.customVtuberName?.trim();

  if (customVtuberName) {
    names.push(customVtuberName);
  }

  return names.length > 0
    ? names.join(" · ")
    : "방송 일정";
}

function makeManualItems(
  videos: ManualVideo[],
) {
  const now = Date.now();

  return videos
    .filter(
      (video) =>
        video.status === "live" ||
        video.status === "upcoming",
    )
    .map<HomeBroadcastItem>((video) => ({
      id: `manual-${video.id}`,
      ownerName: video.channelTitle,
      title: video.title,
      status:
        video.status === "live"
          ? "live"
          : "upcoming",
      scheduledAt:
        getManualDisplayTime(video),
      youtubeUrl: video.youtubeUrl,
    }))
    .filter((item) => {
      if (item.status === "live") {
        return true;
      }

      const timestamp = getTimestamp(
        item.scheduledAt,
      );

      return (
        Number.isFinite(timestamp) &&
        timestamp >= now
      );
    })
    .sort((a, b) => {
      if (
        a.status === "live" &&
        b.status !== "live"
      ) {
        return -1;
      }

      if (
        b.status === "live" &&
        a.status !== "live"
      ) {
        return 1;
      }

      const aTime =
        getTimestamp(a.scheduledAt);
      const bTime =
        getTimestamp(b.scheduledAt);

      if (
        a.status === "live" &&
        b.status === "live"
      ) {
        return bTime - aTime;
      }

      return aTime - bTime;
    })
    .slice(0, 8);
}

function makePlanItems(
  plans: LiveStreamPlan[],
) {
  const now = Date.now();

  return plans
    .filter((plan) => {
      if (
        plan.status === "cancelled" ||
        !plan.scheduledAt
      ) {
        return false;
      }

      const timestamp = getTimestamp(
        plan.scheduledAt,
      );

      return (
        Number.isFinite(timestamp) &&
        timestamp >= now
      );
    })
    .map<HomeBroadcastItem>((plan) => ({
      id: `plan-${plan.id}`,
      ownerName: getPlanOwnerName(plan),
      title:
        plan.title?.trim() ||
        "제목 없는 방송",
      status: "upcoming",
      scheduledAt: plan.scheduledAt,
      youtubeUrl:
        plan.youtubeUrl?.trim() ||
        undefined,
    }))
    .sort(
      (a, b) =>
        getTimestamp(a.scheduledAt) -
        getTimestamp(b.scheduledAt),
    )
    .slice(0, 8);
}

function BroadcastList({
  items,
  emptyMessage,
}: {
  items: HomeBroadcastItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const content = (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition hover:border-violet-600">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.status === "live"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {item.status === "live"
                  ? "LIVE"
                  : "방송 예정"}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-400">
                  {item.ownerName}
                </p>

                <h3 className="mt-1 font-bold">
                  {item.title}
                </h3>
              </div>

              <time className="shrink-0 text-sm font-semibold text-zinc-400">
                {formatDate(
                  item.scheduledAt,
                )}
              </time>
            </div>
          </div>
        );

        if (item.youtubeUrl) {
          return (
            <a
              key={item.id}
              href={item.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              {content}
            </a>
          );
        }

        return (
          <div key={item.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default function HomeBroadcastOverview() {
  const [manualItems, setManualItems] =
    useState<HomeBroadcastItem[]>([]);

  const [planItems, setPlanItems] =
    useState<HomeBroadcastItem[]>([]);

  const [isLoaded, setIsLoaded] =
    useState(false);

  useEffect(() => {
    const supabase = createClient();

    let isMounted = true;

    async function loadItems() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        console.error(
          "로그인 상태를 확인하지 못했습니다.",
          sessionError,
        );
      }

      let manualVideos: ManualVideo[] = [];
      let plans: LiveStreamPlan[] = [];
      
      // 로그인 상태 → Supabase의 manual_videos 사용
      if (session?.user) {
        const { data, error } = await supabase
          .from("sync_data")
          .select("manual_videos, live_stream_plans")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error(
            "계정의 관심 방송 데이터를 읽지 못했습니다.",
            error,
          );
        } else {
          manualVideos = Array.isArray(
            data?.manual_videos,
          )
            ? (data.manual_videos as ManualVideo[])
            : [];

          plans = Array.isArray(
            data?.live_stream_plans,
          )
            ? (data.live_stream_plans as LiveStreamPlan[])
            : [];
        }
      } else {
        // 비로그인 상태 → 기존 localStorage 사용
        manualVideos =
          readStoredArray<ManualVideo>(
            MANUAL_STORAGE_KEY,
          );
        
        plans =
          readStoredArray<LiveStreamPlan>(
            PLAN_STORAGE_KEY,
          );
      }

      // 로그인 상태에 따라 가져온 데이터를 홈 화면용으로 변환
      setManualItems(
        makeManualItems(manualVideos),
      );

      setPlanItems(
        makePlanItems(plans),
      );

      setIsLoaded(true);
    }

    void loadItems();

    function handleReload() {
      void loadItems();
    }

    window.addEventListener(
      "focus",
      handleReload,
    );

    window.addEventListener(
      "storage",
      handleReload,
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void loadItems();
      }, 0);
    });

    return () => {
      isMounted = false;

      window.removeEventListener(
        "focus",
        handleReload,
      );

      window.removeEventListener(
        "storage",
        handleReload,
      );

      subscription.unsubscribe();
    };
  }, []);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-7">
        <h2 className="text-2xl font-bold">
          방송 일정
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          직접 추가한 방송과 작성한 일정을
          확인합니다.
        </p>
      </div>

      {!isLoaded ? (
        <p className="text-sm text-zinc-500">
          방송 일정을 불러오는 중입니다.
        </p>
      ) : (
        <div className="space-y-10">
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">
                  직접 추가한 방송 링크
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  방송 기록 페이지에서 YouTube
                  링크로 추가한 방송입니다.
                </p>
              </div>

              <Link
                href="/streams"
                className="text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                관심 방송 관리 →
              </Link>
            </div>

            <BroadcastList
              items={manualItems}
              emptyMessage="직접 추가한 예정 방송이 없습니다."
            />
          </div>

          <div className="border-t border-zinc-800 pt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">
                  추가한 방송 일정
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  생방송 일정 페이지에서 직접
                  작성한 일정입니다.
                </p>
              </div>

              <Link
                href="/live-streams"
                className="text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                방송 일정 관리 →
              </Link>
            </div>

            <BroadcastList
              items={planItems}
              emptyMessage="현재 추가한 방송 일정이 없습니다."
            />
          </div>
        </div>
      )}
    </section>
  );
}