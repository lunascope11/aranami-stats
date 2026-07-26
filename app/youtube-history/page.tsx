"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

type RawHistoryItem = {
  header?: string;
  title?: string;
  titleUrl?: string;
  subtitles?: {
    name?: string;
    url?: string;
  }[];
  time?: string;
};

type HistoryKind =
  | "video"
  | "music"
  | "post";

type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  videoId: string | null;
  title: string;
  channelTitle: string;
  watchedAt: string;
};

type VideoMetadata = {
  id: string;
  title: string;
  channelId: string | null;
  channelTitle: string;
  durationSeconds: number;
  publishedAt: string | null;
  categoryId: string | null;
  hasShortsHint: boolean;
  isLiveBroadcast: boolean;
};

type PeriodKey =
  | "1"
  | "3"
  | "6"
  | "9"
  | "12"
  | "all";

type ApiResponse = {
  items?: VideoMetadata[];
  missingIds?: string[];
  error?: string;
};

const PERIOD_OPTIONS: {
  key: PeriodKey;
  label: string;
  months: number | null;
}[] = [
  {
    key: "1",
    label: "최근 1개월",
    months: 1,
  },
  {
    key: "3",
    label: "최근 3개월",
    months: 3,
  },
  {
    key: "6",
    label: "최근 6개월",
    months: 6,
  },
  {
    key: "9",
    label: "최근 9개월",
    months: 9,
  },
  {
    key: "12",
    label: "최근 1년",
    months: 12,
  },
  {
    key: "all",
    label: "전체",
    months: null,
  },
];

const SHORTS_STANDARD_DATE =
  new Date("2024-10-15T00:00:00Z");

const DAY_NAMES = [
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
  "일",
];

function cleanTakeoutTitle(
  title: string | undefined,
) {
  return (
    title
      ?.replace(
        /^Vous avez (?:regardé|consulté)\s+/i,
        "",
      )
      .trim() || "(제목 없음)"
  );
}

function extractVideoId(
  urlText: string,
) {
  try {
    const url = new URL(urlText);
    const id = url.searchParams.get("v");

    if (
      id &&
      /^[A-Za-z0-9_-]{11}$/.test(id)
    ) {
      return id;
    }

    return null;
  } catch {
    return null;
  }
}

function parseWatchHistory(
  rawData: unknown,
) {
  if (!Array.isArray(rawData)) {
    throw new Error(
      "Google Takeout JSON 형식이 아닙니다.",
    );
  }

  const parsed: HistoryEntry[] = [];

  rawData.forEach((rawItem, index) => {
    const item = rawItem as RawHistoryItem;

    if (
      typeof item.time !== "string" ||
      typeof item.titleUrl !== "string"
    ) {
      return;
    }

    const watchedDate =
      new Date(item.time);

    if (
      Number.isNaN(
        watchedDate.getTime(),
      )
    ) {
      return;
    }

    let url: URL;

    try {
      url = new URL(item.titleUrl);
    } catch {
      return;
    }

    const normalizedHeader = (
      item.header ?? ""
    ).replace(/\u00a0/g, " ");

    const isPost =
      url.pathname.startsWith("/post/");

    const isMusic =
      normalizedHeader.includes(
        "YouTube Music",
      ) ||
      url.hostname ===
        "music.youtube.com";

    const videoId = isPost
      ? null
      : extractVideoId(item.titleUrl);

    if (!isPost && !videoId) {
      return;
    }

    parsed.push({
      id: `${item.time}-${index}`,
      kind: isPost
        ? "post"
        : isMusic
          ? "music"
          : "video",
      videoId,
      title: cleanTakeoutTitle(
        item.title,
      ),
      channelTitle:
        item.subtitles?.[0]?.name ??
        "(채널 정보 없음)",
      watchedAt: item.time,
    });
  });

  if (parsed.length === 0) {
    throw new Error(
      "분석 가능한 기록을 찾지 못했습니다.",
    );
  }

  return parsed.sort(
    (first, second) =>
      new Date(second.watchedAt).getTime() -
      new Date(first.watchedAt).getTime(),
  );
}

function splitIntoChunks<T>(
  values: T[],
  size: number,
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(index, index + size),
    );
  }

  return chunks;
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "ko-KR",
  ).format(value);
}

function formatPercent(
  value: number,
  total: number,
) {
  if (total === 0) {
    return "0.0%";
  }

  return `${(
    (value / total) *
    100
  ).toFixed(1)}%`;
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date(value));
}

function getKstTimeParts(
  dateText: string,
) {
  const originalDate =
    new Date(dateText);

  const kstDate = new Date(
    originalDate.getTime() +
      9 * 60 * 60 * 1000,
  );

  const hour =
    kstDate.getUTCHours();

  const sundayBasedDay =
    kstDate.getUTCDay();

  const mondayBasedDay =
    (sundayBasedDay + 6) % 7;

  return {
    hour,
    day: mondayBasedDay,
  };
}

function isEstimatedShort(
  metadata: VideoMetadata,
) {
  if (
    metadata.isLiveBroadcast ||
    metadata.durationSeconds <= 0
  ) {
    return false;
  }

  // 60초 이하는 쇼츠로 추정
  if (metadata.durationSeconds <= 60) {
    return true;
  }

  // 60~180초는 #shorts 흔적이 있을 때만
  if (
    metadata.durationSeconds <= 180 &&
    metadata.hasShortsHint
  ) {
    return true;
  }

  return false;
}

type ChannelAggregate = {
  count: number;
  videoIds: Set<string>;
};

type ChannelRankingItem = {
  channelTitle: string;
  count: number;
  uniqueVideos: number;
};

function isTopicChannel(
  channelTitle: string,
) {
  return /\s*[-–—]\s*topic\s*$/i.test(
    channelTitle.trim(),
  );
}

function addChannelRecord(
  channelMap: Map<
    string,
    ChannelAggregate
  >,
  channelTitle: string,
  videoId: string | null,
) {
  const channel =
    channelMap.get(channelTitle) ?? {
      count: 0,
      videoIds: new Set<string>(),
    };

  channel.count += 1;

  if (videoId) {
    channel.videoIds.add(videoId);
  }

  channelMap.set(
    channelTitle,
    channel,
  );
}

function buildTopChannels(
  channelMap: Map<
    string,
    ChannelAggregate
  >,
) {
  return [...channelMap.entries()]
    .map(
      ([channelTitle, data]) => ({
        channelTitle,
        count: data.count,
        uniqueVideos:
          data.videoIds.size,
      }),
    )
    .sort(
      (first, second) =>
        second.count - first.count,
    )
    .slice(0, 10);
}

function BarRow({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  maxCount: number;
}) {
  const width =
    maxCount === 0
      ? 0
      : (count / maxCount) * 100;

  return (
    <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3">
      <span className="text-sm text-zinc-400">
        {label}
      </span>

      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-red-500 transition-all"
          style={{
            width: `${width}%`,
          }}
        />
      </div>

      <span className="text-right text-sm text-zinc-300">
        {formatNumber(count)}회
      </span>
    </div>
  );
}

export default function YoutubeHistoryPage() {
  const [history, setHistory] =
    useState<HistoryEntry[]>([]);

  const [videoMap, setVideoMap] =
    useState<
      Record<string, VideoMetadata>
    >({});

  const [
    unavailableVideoIds,
    setUnavailableVideoIds,
  ] = useState<string[]>([]);

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] = useState<PeriodKey>("1");

  const [fileName, setFileName] =
    useState("");

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    analysisCompleted,
    setAnalysisCompleted,
  ] = useState(false);

  const [isDragging, setIsDragging] =
    useState(false);

  const [progress, setProgress] =
    useState({
      current: 0,
      total: 0,
    });

  const latestHistoryTime =
    history[0]?.watchedAt ?? null;

  const oldestHistoryTime =
    history.at(-1)?.watchedAt ?? null;

  const filteredHistory =
    useMemo(() => {
      if (
        history.length === 0 ||
        !latestHistoryTime
      ) {
        return [];
      }

      const selectedOption =
        PERIOD_OPTIONS.find(
          (option) =>
            option.key ===
            selectedPeriod,
        );

      if (
        !selectedOption ||
        selectedOption.months === null
      ) {
        return history;
      }

      const cutoffDate = new Date(
        latestHistoryTime,
      );

      cutoffDate.setUTCMonth(
        cutoffDate.getUTCMonth() -
          selectedOption.months,
      );

      return history.filter(
        (entry) =>
          new Date(
            entry.watchedAt,
          ).getTime() >=
          cutoffDate.getTime(),
      );
    }, [
      history,
      latestHistoryTime,
      selectedPeriod,
    ]);

  const statistics = useMemo(() => {
    const contentCounts = {
      regular: 0,
      live: 0,
      shorts: 0,
      music: 0,
      post: 0,
      unavailable: 0,
    };

    let confirmedShorts = 0;

    const hourCounts =
      Array.from(
        { length: 24 },
        () => 0,
      );

    const dayCounts =
      Array.from(
        { length: 7 },
        () => 0,
      );

    const musicChannelMap =
      new Map<
        string,
        ChannelAggregate
      >();

    const shortsChannelMap =
      new Map<
        string, 
        ChannelAggregate
      >();

    const generalChannelMap =
      new Map<
        string,
        ChannelAggregate
      >();

    const lengthCounts = {
      under5: 0,
      fiveTo15: 0,
      fifteenTo30: 0,
      thirtyTo60: 0,
      sixtyTo120: 0,
      over120: 0,
    };

    const shortsLengthCounts = {
      under30: 0,
      thirtyTo60: 0,
      sixtyTo90: 0,
      ninetyTo120: 0,
      oneTwentyTo180: 0,
    };

    const uniqueVideoIds =
      new Set<string>();

    filteredHistory.forEach(
      (entry) => {
        if (entry.kind === "post") {
          contentCounts.post += 1;
          return;
        }

        const {
          hour,
          day,
        } = getKstTimeParts(
          entry.watchedAt,
        );

        hourCounts[hour] += 1;
        dayCounts[day] += 1;

        if (entry.videoId) {
          uniqueVideoIds.add(
            entry.videoId,
          );
        }

        const metadata =
          entry.videoId
            ? videoMap[entry.videoId]
            : undefined;

        const channelTitle =
          metadata?.channelTitle ||
          entry.channelTitle;

        const isMusicListening =
          entry.kind === "music" ||
          isTopicChannel(channelTitle);

        if (isMusicListening) {
          addChannelRecord(
            musicChannelMap,
            channelTitle,
            entry.videoId,
          );

          contentCounts.music += 1;
          return;
        }

        if (!metadata) {
          contentCounts.unavailable += 1;
          return;
        }

        if (metadata.isLiveBroadcast) {
          contentCounts.live += 1;

          addChannelRecord(
            generalChannelMap,
            channelTitle,
            entry.videoId,
          );
        } else if (isEstimatedShort(metadata)) {
          contentCounts.shorts += 1;

          addChannelRecord(
            shortsChannelMap,
            channelTitle,
            entry.videoId,
          );

          if (metadata.hasShortsHint) {
            confirmedShorts += 1;
          }

          // 쇼츠 길이 분포
          const seconds =
            metadata.durationSeconds;

          if (seconds < 30) {
            shortsLengthCounts.under30 += 1;
          } else if (seconds <= 60) {
            shortsLengthCounts.thirtyTo60 += 1;
          } else if (seconds <= 90) {
            shortsLengthCounts.sixtyTo90 += 1;
          } else if (seconds <= 120) {
            shortsLengthCounts.ninetyTo120 += 1;
          } else {
            shortsLengthCounts.oneTwentyTo180 += 1;
          }

          // 일반 영상 길이 분포에는 넣지 않음
          return;
        } else {
          contentCounts.regular += 1;

          addChannelRecord(
            generalChannelMap,
            channelTitle,
            entry.videoId,
          );
        }
        const minutes =
          metadata.durationSeconds /
          60;

        if (minutes < 5) {
          lengthCounts.under5 += 1;
        } else if (minutes < 15) {
          lengthCounts.fiveTo15 += 1;
        } else if (minutes < 30) {
          lengthCounts.fifteenTo30 += 1;
        } else if (minutes < 60) {
          lengthCounts.thirtyTo60 += 1;
        } else if (minutes < 120) {
          lengthCounts.sixtyTo120 += 1;
        } else {
          lengthCounts.over120 += 1;
        }
      },
    );

    const musicTopChannels =
      buildTopChannels(
        musicChannelMap,
      );

    const shortsTopChannels =
      buildTopChannels(
        shortsChannelMap,
      );

    const generalTopChannels =
      buildTopChannels(
        generalChannelMap,
      );

    return {
      contentCounts,
      confirmedShorts,
      hourCounts,
      dayCounts,
      musicTopChannels,
      shortsTopChannels,
      generalTopChannels,
      lengthCounts,
      shortsLengthCounts,
      uniqueVideoCount:
        uniqueVideoIds.size,
    };
  }, [
    filteredHistory,
    videoMap,
  ]);

  async function loadHistoryFile(
    file: File,
  ) {
    if (
      !file.name
        .toLowerCase()
        .endsWith(".json")
    ) {
      setError(
        "JSON 파일만 선택할 수 있습니다.",
      );
      return;
    }

    try {
      setError("");

      const text =
        await file.text();

      const rawData =
        JSON.parse(text) as unknown;

      const parsedHistory =
        parseWatchHistory(rawData);

      setHistory(parsedHistory);
      setFileName(file.name);
      setVideoMap({});
      setUnavailableVideoIds([]);
      setAnalysisCompleted(false);
      setProgress({
        current: 0,
        total: 0,
      });
    } catch (caughtError) {
      setHistory([]);
      setFileName("");
      setVideoMap({});
      setUnavailableVideoIds([]);
      setAnalysisCompleted(false);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "파일을 읽지 못했습니다.",
      );
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    await loadHistoryFile(file);

    event.target.value = "";
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect =
      "copy";

    setIsDragging(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await loadHistoryFile(file);
  }

  async function analyzeHistory() {
    const uniqueIds = [
      ...new Set(
        filteredHistory
          .map(
            (entry) =>
              entry.videoId,
          )
          .filter(
            (
              id,
            ): id is string =>
              typeof id === "string",
          ),
      ),
    ];

    const unavailableSet =
      new Set(
        unavailableVideoIds,
      );

    const idsToFetch =
      uniqueIds.filter(
        (id) =>
          !videoMap[id] &&
          !unavailableSet.has(id),
      );

    setIsLoading(true);
    setError("");
    setAnalysisCompleted(false);

    setProgress({
      current:
        uniqueIds.length -
        idsToFetch.length,
      total: uniqueIds.length,
    });

    try {
      const chunks =
        splitIntoChunks(
          idsToFetch,
          500,
        );

      for (const chunk of chunks) {
        const response =
          await fetch(
            "/api/youtube-videos",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                ids: chunk,
              }),
            },
          );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "영상 정보를 불러오지 못했습니다.",
          );
        }

        const newMetadata: Record<
          string,
          VideoMetadata
        > = {};

        for (
          const item of
          result.items ?? []
        ) {
          newMetadata[item.id] =
            item;
        }

        setVideoMap(
          (previous) => ({
            ...previous,
            ...newMetadata,
          }),
        );

        setUnavailableVideoIds(
          (previous) => [
            ...new Set([
              ...previous,
              ...(result.missingIds ??
                []),
            ]),
          ],
        );

        setProgress(
          (previous) => ({
            ...previous,
            current: Math.min(
              previous.total,
              previous.current +
                chunk.length,
            ),
          }),
        );
      }

      setProgress({
        current: uniqueIds.length,
        total: uniqueIds.length,
      });

      setAnalysisCompleted(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "분석 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const contentRows = [
    {
      label: "일반 영상",
      value:
        statistics.contentCounts
          .regular,
    },
    {
      label: "생방송·아카이브",
      value:
        statistics.contentCounts.live,
    },
    {
      label: "쇼츠 추정",
      value:
        statistics.contentCounts
          .shorts,
    },
    {
      label: "YouTube Music",
      value:
        statistics.contentCounts.music,
    },
    {
      label: "커뮤니티 게시물",
      value:
        statistics.contentCounts.post,
    },
    {
      label: "정보 확인 불가",
      value:
        statistics.contentCounts
          .unavailable,
    },
  ];

  const contentTotal =
    contentRows.reduce(
      (sum, row) =>
        sum + row.value,
      0,
    );

  const lengthRows = [
    {
      label: "5분 미만",
      value:
        statistics.lengthCounts
          .under5,
    },
    {
      label: "5~15분",
      value:
        statistics.lengthCounts
          .fiveTo15,
    },
    {
      label: "15~30분",
      value:
        statistics.lengthCounts
          .fifteenTo30,
    },
    {
      label: "30~60분",
      value:
        statistics.lengthCounts
          .thirtyTo60,
    },
    {
      label: "1~2시간",
      value:
        statistics.lengthCounts
          .sixtyTo120,
    },
    {
      label: "2시간 이상",
      value:
        statistics.lengthCounts
          .over120,
    },
  ];

const shortsLengthRows = [
  {
    label: "30초 미만",
    value:
      statistics.shortsLengthCounts
        .under30,
  },
  {
    label: "30~60초",
    value:
      statistics.shortsLengthCounts
        .thirtyTo60,
  },
  {
    label: "60~90초",
    value:
      statistics.shortsLengthCounts
        .sixtyTo90,
  },
  {
    label: "90~120초",
    value:
      statistics.shortsLengthCounts
        .ninetyTo120,
  },
  {
    label: "120~180초",
    value:
      statistics.shortsLengthCounts
        .oneTwentyTo180,
  },
];

  const maxHourCount = Math.max(
    ...statistics.hourCounts,
    0,
  );

  const maxDayCount = Math.max(
    ...statistics.dayCounts,
    0,
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">
          YouTube 시청 기록 분석
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Google Takeout의
          watch-history.json을
          불러와 시청 습관을
          분석합니다.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={
            handleDragLeave
          }
          onDrop={handleDrop}
          className={`mt-8 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            isDragging
              ? "border-red-400 bg-red-950/40"
              : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-500"
          }`}
        >
          <p className="font-semibold text-zinc-200">
            {isDragging
              ? "여기에 파일을 놓아주세요"
              : "watch-history.json을 끌어다 놓으세요"}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            파일은 브라우저에서
            읽으며 영상 ID만 분석
            API로 전달됩니다.
          </p>

          <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500">
            JSON 파일 선택
            <input
              type="file"
              accept=".json,application/json"
              onChange={
                handleFileChange
              }
              className="hidden"
            />
          </label>

          {fileName && (
            <p className="mt-4 text-sm text-emerald-400">
              불러온 파일:{" "}
              {fileName}
            </p>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {history.length > 0 && (
          <>
            <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map(
                  (option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setSelectedPeriod(
                          option.key,
                        );
                        setAnalysisCompleted(
                          false,
                        );
                      }}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        selectedPeriod ===
                        option.key
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ),
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-zinc-400">
                  <p>
                    선택 기간 기록:{" "}
                    <strong className="text-white">
                      {formatNumber(
                        filteredHistory.length,
                      )}
                      건
                    </strong>
                  </p>

                  {latestHistoryTime &&
                    oldestHistoryTime && (
                      <p className="mt-1">
                        전체 기록 범위:{" "}
                        {formatDate(
                          oldestHistoryTime,
                        )}{" "}
                        ~{" "}
                        {formatDate(
                          latestHistoryTime,
                        )}
                      </p>
                    )}
                </div>

                <button
                  type="button"
                  onClick={
                    analyzeHistory
                  }
                  disabled={isLoading}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading
                    ? "분석 중..."
                    : "선택 기간 분석하기"}
                </button>
              </div>

              {progress.total > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs text-zinc-500">
                    <span>
                      영상 정보 확인
                    </span>
                    <span>
                      {formatNumber(
                        progress.current,
                      )}{" "}
                      /{" "}
                      {formatNumber(
                        progress.total,
                      )}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{
                        width: `${
                          progress.total ===
                          0
                            ? 0
                            : (progress.current /
                                progress.total) *
                              100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </section>

            {analysisCompleted && (
              <>
                <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <SummaryCard
                    label="전체 활동"
                    value={`${formatNumber(
                      filteredHistory.length,
                    )}건`}
                  />

                  <SummaryCard
                    label="고유 영상"
                    value={`${formatNumber(
                      statistics.uniqueVideoCount,
                    )}개`}
                  />

                  <SummaryCard
                    label="쇼츠 추정"
                    value={`${formatNumber(
                      statistics
                        .contentCounts
                        .shorts,
                    )}회`}
                    subValue={formatPercent(
                      statistics
                        .contentCounts
                        .shorts,
                      statistics
                        .contentCounts
                        .regular +
                        statistics
                          .contentCounts
                          .live +
                        statistics
                          .contentCounts
                          .shorts,
                    )}
                  />

                  <SummaryCard
                    label="#shorts 확인"
                    value={`${formatNumber(
                      statistics.confirmedShorts,
                    )}회`}
                  />

                  <SummaryCard
                    label="생방송·아카이브"
                    value={`${formatNumber(
                      statistics
                        .contentCounts.live,
                    )}회`}
                  />
                </section>

                <section className="mt-8 grid gap-6 lg:grid-cols-2">
                  <DashboardCard title="콘텐츠 종류">
                    <div className="space-y-4">
                      {contentRows.map(
                        (row) => (
                          <div
                            key={
                              row.label
                            }
                          >
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-300">
                                {
                                  row.label
                                }
                              </span>

                              <span className="text-zinc-400">
                                {formatNumber(
                                  row.value,
                                )}
                                회 ·{" "}
                                {formatPercent(
                                  row.value,
                                  contentTotal,
                                )}
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-red-500"
                                style={{
                                  width: formatPercent(
                                    row.value,
                                    contentTotal,
                                  ),
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </DashboardCard>

                  <DashboardCard title="영상 길이 분포">
                    <div className="space-y-4">
                      {lengthRows.map(
                        (row) => (
                          <div
                            key={
                              row.label
                            }
                            className="flex items-center justify-between border-b border-zinc-800 pb-3 last:border-0"
                          >
                            <span className="text-sm text-zinc-300">
                              {
                                row.label
                              }
                            </span>

                            <span className="font-semibold">
                              {formatNumber(
                                row.value,
                              )}
                              회
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-zinc-500">
                      YouTube Music, 쇼츠 및
                      커뮤니티 게시물은
                      길이 분포에서 제외합니다.
                    </p>
                  </DashboardCard>

                  <DashboardCard title="쇼츠 길이 분포">
                    <div className="space-y-4">
                      {shortsLengthRows.map(
                        (row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between border-b border-zinc-800 pb-3 last:border-0"
                          >
                            <span className="text-sm text-zinc-300">
                              {row.label}
                            </span>

                            <span className="font-semibold">
                              {formatNumber(row.value)}회
                            </span>
                          </div>
                        ),
                      )}
                    </div>

                    <p className="mt-4 text-xs leading-5 text-zinc-500">
                      쇼츠로 추정된 영상만을 대상으로 한
                      길이 분포입니다.
                    </p>
                  </DashboardCard>
                </section>

                <section className="mt-8 grid gap-6">
                  <DashboardCard title="음악 채널 TOP 10">
                    <ChannelRankingTable
                      channels={
                        statistics.musicTopChannels
                      }
                    />

                      <p className="mt-4 text-xs leading-5 text-zinc-500">
                        YouTube Music에서 재생했거나
                        채널명이 - Topic으로 끝나는
                        기록입니다.
                      </p>
                  </DashboardCard>

                  <DashboardCard title="쇼츠 채널 TOP 10">
                    <ChannelRankingTable
                      channels={
                        statistics.shortsTopChannels
                      }
                    />

                      <p className="mt-4 text-xs leading-5 text-zinc-500">
                        쇼츠로 추정된 영상의 채널
                        기록입니다.
                      </p>
                  </DashboardCard>

                  <DashboardCard title="일반 영상 채널 TOP 10">
                    <ChannelRankingTable
                      channels={
                        statistics.generalTopChannels
                      }
                    />

                      <p className="mt-4 text-xs leading-5 text-zinc-500">
                        쇼츠와 음악 감상을 제외한
                        일반 영상·생방송·아카이브
                        기록입니다.
                      </p>
                  </DashboardCard>
                </section>
                      
                <section className="mt-8 grid gap-6 lg:grid-cols-2">
                  <DashboardCard title="시간대별 시청 기록">
                    <div className="space-y-3">
                      {statistics.hourCounts.map(
                        (
                          count,
                          hour,
                        ) => (
                          <BarRow
                            key={
                              hour
                            }
                            label={`${String(
                              hour,
                            ).padStart(
                              2,
                              "0",
                            )}시`}
                            count={
                              count
                            }
                            maxCount={
                              maxHourCount
                            }
                          />
                        ),
                      )}
                    </div>

                    <p className="mt-4 text-xs text-zinc-500">
                      한국 시간 기준이며
                      커뮤니티 게시물은
                      제외합니다.
                    </p>
                  </DashboardCard>

                  <DashboardCard title="요일별 시청 기록">
                    <div className="space-y-4">
                      {statistics.dayCounts.map(
                        (
                          count,
                          index,
                        ) => (
                          <BarRow
                            key={
                              DAY_NAMES[
                                index
                              ]
                            }
                            label={`${DAY_NAMES[index]}요일`}
                            count={
                              count
                            }
                            maxCount={
                              maxDayCount
                            }
                          />
                        ),
                      )}
                    </div>
                  </DashboardCard>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ChannelRankingTable({
  channels,
}: {
  channels: ChannelRankingItem[];
}) {
  if (channels.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        해당하는 채널 기록이
        없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-zinc-500">
          <tr className="border-b border-zinc-800">
            <th className="pb-3">
              순위
            </th>

            <th className="pb-3">
              채널
            </th>

            <th className="pb-3 text-right">
              재생
            </th>

            <th className="pb-3 text-right">
              고유 영상
            </th>
          </tr>
        </thead>

        <tbody>
          {channels.map(
            (channel, index) => (
              <tr
                key={
                  channel.channelTitle
                }
                className="border-b border-zinc-800/70 last:border-0"
              >
                <td className="py-4 text-zinc-500">
                  {index + 1}
                </td>

                <td className="py-4 font-medium">
                  {
                    channel.channelTitle
                  }
                </td>

                <td className="py-4 text-right">
                  {formatNumber(
                    channel.count,
                  )}
                  회
                </td>

                <td className="py-4 text-right text-zinc-400">
                  {formatNumber(
                    channel.uniqueVideos,
                  )}
                  개
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

      {subValue && (
        <p className="mt-1 text-sm text-zinc-400">
          {subValue}
        </p>
      )}
    </div>
  );
}

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </div>
  );
}