"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

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
  concurrentViewers?: number;
  thumbnail?: string;
  youtubeUrl: string;
};

const STORAGE_KEY =
  "manual-youtube-watch-list";

const statusLabels: Record<
  ManualVideoStatus,
  string
> = {
  live: "LIVE",
  upcoming: "방송 예정",
  ended: "방송 종료",
  video: "일반 영상",
};

const statusStyles: Record<
  ManualVideoStatus,
  string
> = {
  live: "bg-red-600 text-white",
  upcoming: "bg-blue-600 text-white",
  ended: "bg-zinc-700 text-zinc-200",
  video: "bg-violet-700 text-white",
};

function formatDate(value?: string) {
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

function getDisplayTime(item: ManualVideo) {
  return (
    item.scheduledAt ??
    item.actualStartAt ??
    item.publishedAt
  );
}

async function requestVideos(urls: string[]) {
  const results: ManualVideo[] = [];

  // YouTube videos.list 요청은 한 번에 최대
  // 50개 단위로 나눠서 처리
  for (
    let index = 0;
    index < urls.length;
    index += 50
  ) {
    const batch = urls.slice(index, index + 50);

    const response = await fetch(
      "/api/youtube/manual-videos",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: batch,
        }),
      },
    );

    const data = (await response.json()) as {
      items?: ManualVideo[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        data.error ??
          "방송 정보를 가져오지 못했습니다.",
      );
    }

    results.push(...(data.items ?? []));
  }

  return results;
}

export default function ManualWatchList() {
  const [items, setItems] = useState<
    ManualVideo[]
  >([]);

  const [linksText, setLinksText] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [cloudItemCount, setCloudItemCount] =
    useState<number | null>(null);

  const [localItems, setLocalItems] = useState<
    ManualVideo[]
  >([]);


  async function saveItems(
    nextItems: ManualVideo[],
  ) {
    if (!isLoggedIn) {
    setItems(nextItems);
    setLocalItems(nextItems);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextItems),
    );

    return;
  }

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        "로그인 정보를 확인하지 못했습니다.",
      );
    }

    const { error } = await supabase
      .from("sync_data")
      .update({
        manual_videos: nextItems,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    setItems(nextItems);
    setCloudItemCount(nextItems.length);
  }

  useEffect(() => {
    async function loadItems() {
      const savedItems =
        localStorage.getItem(STORAGE_KEY);

      let parsedLocalItems: ManualVideo[] = [];

      if (savedItems) {
        try {
          parsedLocalItems =
            JSON.parse(savedItems) as ManualVideo[];
        } catch (error) {
          console.error(
            "브라우저의 관심 방송 목록을 읽지 못했습니다.",
            error,
          );
        }
      }

      setLocalItems(parsedLocalItems);

      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "로그인 상태를 확인하지 못했습니다.",
          sessionError,
        );
      }

      const user = session?.user ?? null;

      // 로그인 사용자
      if (user) {
        setIsLoggedIn(true);

        const { data, error } = await supabase
          .from("sync_data")
          .select("manual_videos")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "계정의 관심 방송 데이터를 읽지 못했습니다.",
            error,
          );
          return;
        }

        const cloudItems = Array.isArray(
          data?.manual_videos,
        )
          ? (data.manual_videos as ManualVideo[])
          : [];

        setItems(cloudItems);
        setCloudItemCount(cloudItems.length);

        if (cloudItems.length > 0) {
          try {
            const freshItems = await requestVideos(
              cloudItems.map((item) => item.youtubeUrl),
            );

            const freshItemMap = new Map(
              freshItems.map((item) => [
                item.id,
                item,
             ]),
            );

            const updatedItems = cloudItems.map(
              (oldItem) =>
                freshItemMap.get(oldItem.id) ??
                oldItem,
            );

            const { error: updateError } =
              await supabase
                .from("sync_data")
                .update({
                  manual_videos: updatedItems,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);

            if (updateError) {
              console.error(
                "계정의 방송 상태를 저장하지 못했습니다.",
                updateError,
              );
            } else {
              setItems(updatedItems);
              setCloudItemCount(updatedItems.length);
            }
          } catch (error) {
            console.error(
              "계정의 방송 상태를 갱신하지 못했습니다.",
              error,
            );
          }
        }

        return;
      }

      // 비로그인 사용자
      setIsLoggedIn(false);
      setCloudItemCount(null);
      setItems(parsedLocalItems);

      if (parsedLocalItems.length > 0) {
        try {
          const freshItems = await requestVideos(
            parsedLocalItems.map(
              (item) => item.youtubeUrl,
            ),
          );

          const freshItemMap = new Map(
            freshItems.map((item) => [
              item.id,
              item,
            ]),
          );

          const updatedItems =
            parsedLocalItems.map(
              (oldItem) =>
                freshItemMap.get(oldItem.id) ??
                oldItem,
            );

          setItems(updatedItems);
          setLocalItems(updatedItems);

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(updatedItems),
          );
        } catch (error) {
          console.error(
            "브라우저의 방송 상태를 갱신하지 못했습니다.",
            error,
          );
        }
      }

      if (!savedItems) {
        setItems([]);
        return;
      }

      try {
        const parsedItems =
          JSON.parse(savedItems) as ManualVideo[];

        setItems(parsedItems);
      } catch (error) {
        console.error(
          "관심 방송 목록을 읽지 못했습니다.",
          error,
        );

        setItems([]);
      }
    }

    void loadItems();
  }, []);

  async function addVideos(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const urls = [
      ...new Set(
        linksText
          .split(/\s+/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    if (urls.length === 0) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const newItems =
        await requestVideos(urls);

      if (newItems.length === 0) {
        throw new Error(
          "조회 가능한 방송이 없습니다.",
        );
      }

      const itemMap = new Map(
        items.map((item) => [
          item.id,
          item,
        ]),
      );

      for (const newItem of newItems) {
        itemMap.set(newItem.id, newItem);
      }

      const nextItems = [
        ...itemMap.values(),
      ];

      await saveItems(nextItems);
      setLinksText("");

      setMessage(
        `${newItems.length}개 방송을 추가했습니다.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "방송을 추가하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshItems() {
    if (items.length === 0) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const freshItems =
        await requestVideos(
          items.map(
            (item) => item.youtubeUrl,
          ),
        );

      const freshItemMap = new Map(
        freshItems.map((item) => [
          item.id,
          item,
        ]),
      );

      const nextItems = items.map(
        (oldItem) =>
          freshItemMap.get(oldItem.id) ??
          oldItem,
      );

      await saveItems(nextItems);
      setMessage("방송 상태를 갱신했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "갱신하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function removeItem(id: string) {
    try {
      await saveItems(
        items.filter((item) => item.id !== id),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "삭제하지 못했습니다.",
      );
    }
  }

  async function importLocalItemsToCloud() {
    if (!isLoggedIn || localItems.length === 0) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "로그인 정보를 확인하지 못했습니다.",
        );
      }

      const { error } = await supabase
        .from("sync_data")
        .update({
          manual_videos: localItems,
        })
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setItems(localItems);
      setCloudItemCount(localItems.length);

      setMessage(
        `현재 브라우저의 ${localItems.length}개 방송을 계정에 가져왔습니다.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "계정으로 가져오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const sortedItems = [...items].sort(
    (a, b) => {
      const statusOrder = {
        live: 0,
        upcoming: 1,
        ended: 2,
        video: 3,
      };

      const statusDifference =
        statusOrder[a.status] -
        statusOrder[b.status];

      if (statusDifference !== 0) {
        return statusDifference;
      }

      const aTime = new Date(
        getDisplayTime(a),
      ).getTime();

      const bTime = new Date(
        getDisplayTime(b),
      ).getTime();

      if (a.status === "upcoming") {
        return aTime - bTime;
      }

      return bTime - aTime;
    },
  );

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            직접 추가한 관심 방송
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            명부에 없는 라이버도 방송 링크만
            등록할 수 있습니다.
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            저장 위치:{" "}
            {isLoggedIn
              ? "로그인 계정"
              : "이 브라우저"}
          </p>

          {isLoggedIn && cloudItemCount !== null && (
            <p className="mt-1 text-xs text-zinc-600">
              계정 데이터: {cloudItemCount}개 /
              현재 브라우저 데이터: {localItems.length}개
            </p>
          )}

          {isLoggedIn &&
            cloudItemCount === 0 &&
            localItems.length > 0 && (
              <button
                type="button"
                onClick={importLocalItemsToCloud}
                disabled={isLoading}
                className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                이 브라우저 데이터를 계정에 가져오기
              </button>
            )}
        </div>

        <button
          type="button"
          onClick={refreshItems}
          disabled={
            isLoading || items.length === 0
          }
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          상태 새로고침
        </button>
      </div>

      <form
        onSubmit={addVideos}
        className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
      >
        <textarea
          value={linksText}
          onChange={(event) =>
            setLinksText(event.target.value)
          }
          rows={4}
          placeholder={
            "YouTube 방송 링크를 붙여넣기\n여러 개는 한 줄에 하나씩 입력"
          }
          className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "방송 확인 중..."
              : "링크 추가"}
          </button>

          {message && (
            <p className="text-sm text-zinc-400">
              {message}
            </p>
          )}
        </div>
      </form>

      {sortedItems.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {sortedItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
            >
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
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}
                  >
                    {statusLabels[item.status]}
                  </span>

                  <time className="text-sm text-zinc-500">
                    {formatDate(
                      getDisplayTime(item),
                    )}
                  </time>
                </div>

                <p className="text-sm text-violet-400">
                  {item.channelTitle}
                </p>

                <h3 className="mt-1 line-clamp-2 text-xl font-bold">
                  {item.title}
                </h3>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={item.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
                  >
                    YouTube에서 보기
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.id)
                    }
                    className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
          아직 직접 추가한 방송이 없습니다.
        </div>
      )}
    </section>
  );
}