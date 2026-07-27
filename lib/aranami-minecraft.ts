import { aranamiParticipants } from "../data/aranami-participants";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const ARANAMI_START_MS = new Date(
  "2026-06-07T00:00:00+09:00",
).getTime();

type ChannelResponse = {
  items?: Array<{
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
};

type PlaylistItemsResponse = {
  items?: Array<{
    contentDetails: {
      videoId: string;
      videoPublishedAt?: string;
    };
  }>;

  nextPageToken?: string;
};

type VideosResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      liveBroadcastContent: "live" | "upcoming" | "none";
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
};

export type AranamiMinecraftStream = {
  videoId: string;
  vtuberId: string;
  vtuberName: string;
  title: string;
  channelTitle: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  isLive: boolean;
  youtubeUrl: string;
};

export type AranamiVtuberOverlap = {
  vtuberId: string;
  vtuberName: string;
  overlapMs: number;
  overlapRatio: number;
};

export type AranamiVtuberStats = {
  vtuberId: string;
  vtuberName: string;
  streamCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  overlaps: AranamiVtuberOverlap[];
  soloDurationMs?: number;
  soloRatio?: number;
};

export type AranamiVtuberInvestmentStats = {
  vtuberId: string;
  vtuberName: string;

  // 6/7 이후 해당 라이버의 전체 YouTube 방송
  allBroadcastDurationMs: number;
  allBroadcastStreamCount: number;

  // 그중 あらなみマイクラ
  aranamiDurationMs: number;
  aranamiStreamCount: number;

  // 전체 방송 활동 중 あらなみ가 차지하는 비율
  timeInvestmentRatio: number;
  slotInvestmentRatio: number;
};

export type AranamiPairOverlap = {
  vtuberAId: string;
  vtuberAName: string;
  vtuberBId: string;
  vtuberBName: string;
  overlapMs: number;
};

export type AranamiConcurrentGroup = {
  participantCount: number;
  vtuberIds: string[];
  vtuberNames: string[];
  durationMs: number;

  // 같은 인원수의 동시 방송 시간 안에서 이 조합이 차지하는 비율
  ratioWithinCount: number;
};

export type AranamiConcurrentCountStats = {
  participantCount: number;

  // 정확히 이 인원수가 동시에 방송 중이었던 총 시간
  durationMs: number;

  // 전체 방송 커버 시간에서 차지하는 비율
  ratioOfCoveredDuration: number;

  // 정확히 이 멤버들만 동시에 방송 중이었던 시간
  groups: AranamiConcurrentGroup[];
};

export type AranamiConcurrentContinuousSegment = {
  participantCount: number;

  vtuberIds: string[];
  vtuberNames: string[];

  startMs: number;
  endMs: number;
  durationMs: number;
};

export type AranamiMinecraftStats = {
  totalStreams: number;

  // 모든 라이버의 방송시간을 단순 합산
  totalBroadcastDurationMs: number;

  // 적어도 한 명이 방송하고 있었던 시간
  coveredDurationMs: number;

  byVtuber: AranamiVtuberStats[];
  pairOverlaps: AranamiPairOverlap[];

  investmentStats:
  AranamiVtuberInvestmentStats[];

  // 동시 방송 누적
  concurrentStats: AranamiConcurrentCountStats[];

  // 동시 방송 연속
  concurrentContinuousSegments:
  AranamiConcurrentContinuousSegment[];

  maxConcurrentParticipants: number;

  streams: AranamiMinecraftStream[];
};

type TimeInterval = {
  startMs: number;
  endMs: number;
};

type YoutubeChannelIdentifier =
  | {
    type: "handle";
    value: string;
  }
  | {
    type: "channelId";
    value: string;
  };

function extractYoutubeChannelIdentifier(
  youtubeUrl: string,
): YoutubeChannelIdentifier {
  const pathname = new URL(youtubeUrl).pathname;

  const parts = pathname
    .split("/")
    .filter(Boolean);

  const handle = parts.find((part) =>
    part.startsWith("@"),
  );

  if (handle) {
    return {
      type: "handle",
      value: handle,
    };
  }

  const channelIndex =
    parts.indexOf("channel");

  const channelId =
    channelIndex >= 0
      ? parts[channelIndex + 1]
      : undefined;

  if (channelId) {
    return {
      type: "channelId",
      value: channelId,
    };
  }

  throw new Error(
    `YouTube 채널 식별자를 찾지 못했습니다: ${youtubeUrl}`,
  );
}

async function youtubeRequest<T>(
  endpoint: string,
  parameters: Record<string, string>,
): Promise<T> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

  const searchParameters = new URLSearchParams({
    ...parameters,
    key: apiKey,
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/${endpoint}?${searchParameters.toString()}`,
    {
      next: {
        revalidate: 1800,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `YouTube API 요청 실패 (${response.status}): ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * あらなみマイクラ 방송인지 제목으로 판정
 */
function isAranamiMinecraftTitle(title: string): boolean {
  const normalizedTitle = title.toLowerCase();

  const hasAranami =
    normalizedTitle.includes("あらなみ");

  const hasMinecraft =
    normalizedTitle.includes("マイクラ") ||
    normalizedTitle.includes("minecraft");

  return hasAranami && hasMinecraft;
}

function parseYoutubeDuration(
  duration?: string,
): number | null {
  if (!duration) {
    return null;
  }

  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/,
  );

  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return (
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000 +
    seconds * 1000
  );
}

/**
 * 서로 겹치거나 이어진 방송 구간을 하나로 합침.
 */
function mergeIntervals(
  intervals: TimeInterval[],
): TimeInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort(
    (a, b) => a.startMs - b.startMs,
  );

  const merged: TimeInterval[] = [
    { ...sorted[0] },
  ];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];

    if (current.startMs <= last.endMs) {
      last.endMs = Math.max(
        last.endMs,
        current.endMs,
      );
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function getIntervalsDuration(
  intervals: TimeInterval[],
): number {
  return intervals.reduce(
    (total, interval) =>
      total + (interval.endMs - interval.startMs),
    0,
  );
}

/**
 * 두 라이버의 방송 구간이 겹친 총 시간을 계산.
 */
function getOverlapDuration(
  first: TimeInterval[],
  second: TimeInterval[],
): number {
  let firstIndex = 0;
  let secondIndex = 0;
  let overlapMs = 0;

  while (
    firstIndex < first.length &&
    secondIndex < second.length
  ) {
    const a = first[firstIndex];
    const b = second[secondIndex];

    const overlapStart = Math.max(
      a.startMs,
      b.startMs,
    );

    const overlapEnd = Math.min(
      a.endMs,
      b.endMs,
    );

    if (overlapEnd > overlapStart) {
      overlapMs += overlapEnd - overlapStart;
    }

    if (a.endMs < b.endMs) {
      firstIndex += 1;
    } else {
      secondIndex += 1;
    }
  }

  return overlapMs;
}


type ConcurrentTimelineEvents = {
  starts: string[];
  ends: string[];
};

type ConcurrentGroupAccumulator = {
  vtuberIds: string[];
  durationMs: number;
};

/**
 * 라이버별 병합 방송 구간을 시간축으로 훑으면서
 * 정확히 N명이 방송 중이었던 시간과 정확한 멤버 조합을 계산.
 */
function getConcurrentStats(
  intervalMap: Map<string, TimeInterval[]>,
  vtuberNameMap: Map<string, string>,
  coveredDurationMs: number,
): AranamiConcurrentCountStats[] {
  const eventMap = new Map<
    number,
    ConcurrentTimelineEvents
  >();

  function getEventBucket(
    timeMs: number,
  ): ConcurrentTimelineEvents {
    const existing = eventMap.get(timeMs);

    if (existing) {
      return existing;
    }

    const created: ConcurrentTimelineEvents = {
      starts: [],
      ends: [],
    };

    eventMap.set(timeMs, created);

    return created;
  }

  for (const [vtuberId, intervals] of intervalMap) {
    for (const interval of intervals) {
      if (interval.endMs <= interval.startMs) {
        continue;
      }

      getEventBucket(interval.startMs).starts.push(
        vtuberId,
      );

      getEventBucket(interval.endMs).ends.push(
        vtuberId,
      );
    }
  }

  const timeline = [...eventMap.keys()].sort(
    (a, b) => a - b,
  );

  const activeVtuberIds = new Set<string>();

  const durationByParticipantCount = new Map<
    number,
    number
  >();

  const groupDurationByParticipantCount = new Map<
    number,
    Map<string, ConcurrentGroupAccumulator>
  >();

  for (
    let index = 0;
    index < timeline.length - 1;
    index += 1
  ) {
    const timeMs = timeline[index];
    const nextTimeMs = timeline[index + 1];
    const events = eventMap.get(timeMs);

    if (!events) {
      continue;
    }

    // 같은 시각에 방송 종료와 시작이 겹치면
    // 종료를 먼저 반영한 뒤 시작을 반영한다.
    for (const vtuberId of events.ends) {
      activeVtuberIds.delete(vtuberId);
    }

    for (const vtuberId of events.starts) {
      activeVtuberIds.add(vtuberId);
    }

    const durationMs = nextTimeMs - timeMs;
    const participantCount =
      activeVtuberIds.size;

    if (
      durationMs <= 0 ||
      participantCount <= 0
    ) {
      continue;
    }

    durationByParticipantCount.set(
      participantCount,
      (
        durationByParticipantCount.get(
          participantCount,
        ) ?? 0
      ) + durationMs,
    );

    const vtuberIds = [
      ...activeVtuberIds,
    ].sort();

    const groupKey = vtuberIds.join("|");

    let groupMap =
      groupDurationByParticipantCount.get(
        participantCount,
      );

    if (!groupMap) {
      groupMap = new Map();
      groupDurationByParticipantCount.set(
        participantCount,
        groupMap,
      );
    }

    const currentGroup = groupMap.get(groupKey);

    if (currentGroup) {
      currentGroup.durationMs += durationMs;
    } else {
      groupMap.set(groupKey, {
        vtuberIds,
        durationMs,
      });
    }
  }

  const concurrentStats = [
    ...durationByParticipantCount.entries(),
  ].map(([participantCount, durationMs]) => {
    const groupMap =
      groupDurationByParticipantCount.get(
        participantCount,
      ) ??
      new Map<string, ConcurrentGroupAccumulator>();
    const groups: AranamiConcurrentGroup[] = [
      ...groupMap.values(),
    ]
      .map((group) => ({
        participantCount,
        vtuberIds: group.vtuberIds,
        vtuberNames: group.vtuberIds.map(
          (vtuberId) =>
            vtuberNameMap.get(vtuberId) ??
            vtuberId,
        ),
        durationMs: group.durationMs,
        ratioWithinCount:
          durationMs > 0
            ? group.durationMs / durationMs
            : 0,
      }))
      .sort(
        (a, b) =>
          b.durationMs - a.durationMs,
      );

    return {
      participantCount,
      durationMs,
      ratioOfCoveredDuration:
        coveredDurationMs > 0
          ? durationMs / coveredDurationMs
          : 0,
      groups,
    };
  });

  // 사용자가 원하는 랭킹: 가장 오래 유지된 동시 방송 인원수 순
  concurrentStats.sort(
    (a, b) =>
      b.durationMs - a.durationMs ||
      a.participantCount - b.participantCount,
  );

  return concurrentStats;
}

function getConcurrentContinuousSegments(
  intervalMap: Map<string, TimeInterval[]>,
  vtuberNameMap: Map<string, string>,
): AranamiConcurrentContinuousSegment[] {
  const eventMap = new Map<
    number,
    ConcurrentTimelineEvents
  >();

  function getEventBucket(
    timeMs: number,
  ): ConcurrentTimelineEvents {
    const existing = eventMap.get(timeMs);

    if (existing) {
      return existing;
    }

    const created: ConcurrentTimelineEvents = {
      starts: [],
      ends: [],
    };

    eventMap.set(timeMs, created);

    return created;
  }

  for (const [vtuberId, intervals] of intervalMap) {
    for (const interval of intervals) {
      if (interval.endMs <= interval.startMs) {
        continue;
      }

      getEventBucket(interval.startMs).starts.push(
        vtuberId,
      );

      getEventBucket(interval.endMs).ends.push(
        vtuberId,
      );
    }
  }

  const timeline = [...eventMap.keys()].sort(
    (a, b) => a - b,
  );

  const activeVtuberIds = new Set<string>();

  const segments:
    AranamiConcurrentContinuousSegment[] = [];

  for (
    let index = 0;
    index < timeline.length - 1;
    index += 1
  ) {
    const timeMs = timeline[index];
    const nextTimeMs = timeline[index + 1];

    const events = eventMap.get(timeMs);

    if (!events) {
      continue;
    }

    // 같은 시각이면 종료를 먼저 반영
    for (const vtuberId of events.ends) {
      activeVtuberIds.delete(vtuberId);
    }

    for (const vtuberId of events.starts) {
      activeVtuberIds.add(vtuberId);
    }

    const durationMs =
      nextTimeMs - timeMs;

    if (
      durationMs <= 0 ||
      activeVtuberIds.size === 0
    ) {
      continue;
    }

    const vtuberIds = [
      ...activeVtuberIds,
    ].sort();

    const groupKey =
      vtuberIds.join("|");

    const previous =
      segments[segments.length - 1];

    const previousKey =
      previous?.vtuberIds.join("|");

    // 같은 조합이 끊김 없이 이어졌다면
    // 하나의 연속 구간으로 합침
    if (
      previous &&
      previousKey === groupKey &&
      previous.endMs === timeMs
    ) {
      previous.endMs = nextTimeMs;

      previous.durationMs =
        previous.endMs -
        previous.startMs;

      continue;
    }

    segments.push({
      participantCount:
        vtuberIds.length,

      vtuberIds,

      vtuberNames: vtuberIds.map(
        (vtuberId) =>
          vtuberNameMap.get(vtuberId) ??
          vtuberId,
      ),

      startMs: timeMs,
      endMs: nextTimeMs,
      durationMs,
    });
  }

  // 연속 유지시간이 긴 순
  return segments.sort(
    (a, b) =>
      b.durationMs - a.durationMs ||
      b.participantCount -
      a.participantCount,
  );
}

async function getRecentUploadVideoIds(
  uploadsPlaylistId: string,
  limit = 100,
): Promise<string[]> {
  const videoIds: string[] = [];

  let pageToken: string | undefined;

  do {
    const response =
      await youtubeRequest<PlaylistItemsResponse>(
        "playlistItems",
        {
          part: "contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: "50",

          ...(pageToken
            ? {
              pageToken,
            }
            : {}),
        },
      );

    for (const item of response.items ?? []) {
      const videoId =
        item.contentDetails?.videoId;

      if (videoId) {
        videoIds.push(videoId);
      }

      if (videoIds.length >= limit) {
        return videoIds.slice(0, limit);
      }
    }

    pageToken = response.nextPageToken;
  } while (pageToken);

  return videoIds;
}

async function getUploadVideoIdsSince(
  uploadsPlaylistId: string,
  sinceMs: number,
): Promise<string[]> {
  const videoIds: string[] = [];

  let pageToken: string | undefined;

  // 예약 방송이 실제 시작일보다 먼저 만들어졌을 가능성을
  // 고려해 기준일보다 30일 전까지 확인한다.
  const cutoffMs =
    sinceMs -
    30 * 24 * 60 * 60 * 1000;

  do {
    const response =
      await youtubeRequest<PlaylistItemsResponse>(
        "playlistItems",
        {
          part: "contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: "50",

          ...(pageToken
            ? {
              pageToken,
            }
            : {}),
        },
      );

    let reachedCutoff = false;

    for (const item of response.items ?? []) {
      const videoId =
        item.contentDetails?.videoId;

      if (videoId) {
        videoIds.push(videoId);
      }

      const publishedAt =
        item.contentDetails
          ?.videoPublishedAt;

      if (publishedAt) {
        const publishedAtMs =
          new Date(
            publishedAt,
          ).getTime();

        if (
          Number.isFinite(
            publishedAtMs,
          ) &&
          publishedAtMs < cutoffMs
        ) {
          reachedCutoff = true;
        }
      }
    }

    if (reachedCutoff) {
      break;
    }

    pageToken =
      response.nextPageToken;
  } while (pageToken);

  return videoIds;
}

export async function getParticipantBroadcastsSinceStart(): Promise<
  AranamiMinecraftStream[]
> {
  const videoReferences = await Promise.all(
    aranamiParticipants.map(async (vtuber) => {
      const identifier =
        extractYoutubeChannelIdentifier(
          vtuber.youtubeUrl,
        );

      const channelResponse =
        await youtubeRequest<ChannelResponse>(
          "channels",
          {
            part: "contentDetails",

            ...(identifier.type === "handle"
              ? {
                forHandle: identifier.value,
              }
              : {
                id: identifier.value,
              }),
          }
        );

      const channel = channelResponse.items?.[0];

      if (!channel) {
        throw new Error(
          `YouTube 채널을 찾지 못했습니다: ${identifier.value}`,
        );
      }

      const uploadsPlaylistId =
        channel.contentDetails.relatedPlaylists.uploads;

      const videoIds =
        await getUploadVideoIdsSince(
          uploadsPlaylistId,
          ARANAMI_START_MS,
        );

      return videoIds.map((videoId) => ({
        videoId,
        vtuberId: vtuber.id,
      }));
    }),
  );

  const flattenedReferences =
    videoReferences.flat();

  const videoOwnerMap = new Map<
    string,
    string
  >();

  for (const reference of flattenedReferences) {
    videoOwnerMap.set(
      reference.videoId,
      reference.vtuberId,
    );
  }

  const videoIds = [...videoOwnerMap.keys()];

  if (videoIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];

  for (
    let index = 0;
    index < videoIds.length;
    index += 50
  ) {
    batches.push(
      videoIds.slice(index, index + 50),
    );
  }

  const responses = await Promise.all(
    batches.map((batch) =>
      youtubeRequest<VideosResponse>("videos", {
        part: "snippet,liveStreamingDetails,contentDetails",
        id: batch.join(","),
        maxResults: "50",
      }),
    ),
  );

  const videos = responses.flatMap(
    (response) => response.items ?? [],
  );

  const vtuberMap = new Map(
    aranamiParticipants.map((vtuber) => [
      vtuber.id,
      vtuber,
    ]),
  );

  const nowMs = Date.now();

  const streams: AranamiMinecraftStream[] = [];

  let totalLiveDurationMs = 0;
  let totalArchiveDurationMs = 0;
  let archiveDurationCount = 0;


  for (const video of videos) {
    const startedAt =
      video.liveStreamingDetails?.actualStartTime;

    if (!startedAt) {
      // 아직 시작하지 않은 예약 방송은 통계 제외
      continue;
    }

    const isLive =
      video.snippet.liveBroadcastContent === "live";

    const endedAt =
      video.liveStreamingDetails?.actualEndTime;

    // 종료된 방송인데 종료시간을 얻지 못했다면
    // 정확한 통계를 위해 제외
    if (!isLive && !endedAt) {
      continue;
    }

    const startMs = new Date(
      startedAt,
    ).getTime();

    const endMs = endedAt
      ? new Date(endedAt).getTime()
      : nowMs;

    const archiveDurationMs =
      parseYoutubeDuration(
        video.contentDetails?.duration,
      );

    const liveDurationMs =
      endMs - startMs;

    if (archiveDurationMs !== null) {
      const differenceMs =
        archiveDurationMs - liveDurationMs;

      console.log(
        "[duration-debug]",
        {
          title: video.snippet.title,
          channel:
            video.snippet.channelTitle,
          liveDurationMs,
          archiveDurationMs,
          differenceMs,
        },
      );
    }

    if (startMs < ARANAMI_START_MS) {
      continue;
    }

    if (
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      endMs <= startMs
    ) {
      continue;
    }

    const isAranami =
      isAranamiMinecraftTitle(
        video.snippet.title,
      );

    if (isAranami) {
      totalLiveDurationMs +=
        liveDurationMs;

      if (archiveDurationMs !== null) {
        totalArchiveDurationMs +=
          archiveDurationMs;

        archiveDurationCount += 1;

        const differenceMs =
          archiveDurationMs -
          liveDurationMs;

        if (
          Math.abs(differenceMs) >=
          60 * 1000
        ) {
          console.log(
            "[duration-debug]",
            {
              title:
                video.snippet.title,
              channel:
                video.snippet.channelTitle,

              liveMinutes:
                liveDurationMs /
                1000 /
                60,

              archiveMinutes:
                archiveDurationMs /
                1000 /
                60,

              differenceMinutes:
                differenceMs /
                1000 /
                60,
            },
          );
        }
      }
    }

    const vtuberId =
      videoOwnerMap.get(video.id);

    if (!vtuberId) {
      continue;
    }

    const vtuber = vtuberMap.get(vtuberId);

    streams.push({
      videoId: video.id,
      vtuberId,
      vtuberName:
        vtuber?.name ??
        video.snippet.channelTitle,
      title: video.snippet.title,
      channelTitle:
        video.snippet.channelTitle,
      startedAt,
      endedAt,
      durationMs: liveDurationMs,
      isLive,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
    });
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[duration-debug-summary]",
      {
        archiveDurationCount,

        totalLiveHours:
          totalLiveDurationMs /
          1000 /
          60 /
          60,

        totalArchiveHours:
          totalArchiveDurationMs /
          1000 /
          60 /
          60,

        differenceHours:
          (
            totalArchiveDurationMs -
            totalLiveDurationMs
          ) /
          1000 /
          60 /
          60,
      },
    );
  }
  return streams.sort(
    (a, b) =>
      new Date(a.startedAt).getTime() -
      new Date(b.startedAt).getTime(),
  );
}

export async function getAranamiMinecraftStreams(): Promise<
  AranamiMinecraftStream[]
> {
  const allBroadcasts =
    await getParticipantBroadcastsSinceStart();

  return allBroadcasts.filter(
    (stream) =>
      isAranamiMinecraftTitle(
        stream.title,
      ),
  );
}

export async function getAranamiMinecraftStats(): Promise<
  AranamiMinecraftStats
> {
  const allBroadcasts =
    await getParticipantBroadcastsSinceStart();

  const streams =
    allBroadcasts.filter(
      (stream) =>
        isAranamiMinecraftTitle(
          stream.title,
        ),
    );

  const nowMs = Date.now();

  const streamsByVtuber = new Map<
    string,
    AranamiMinecraftStream[]
  >();

  for (const stream of streams) {
    const current =
      streamsByVtuber.get(stream.vtuberId) ?? [];

    current.push(stream);

    streamsByVtuber.set(
      stream.vtuberId,
      current,
    );
  }

  const intervalMap = new Map<
    string,
    TimeInterval[]
  >();

  for (const [
    vtuberId,
    vtuberStreams,
  ] of streamsByVtuber) {
    const intervals = vtuberStreams.map(
      (stream) => ({
        startMs: new Date(
          stream.startedAt,
        ).getTime(),

        endMs: stream.endedAt
          ? new Date(
            stream.endedAt,
          ).getTime()
          : nowMs,
      }),
    );

    intervalMap.set(
      vtuberId,
      mergeIntervals(intervals),
    );
  }

  const vtuberStatsMap = new Map<
    string,
    AranamiVtuberStats
  >();

  for (const [
    vtuberId,
    vtuberStreams,
  ] of streamsByVtuber) {
    const intervals =
      intervalMap.get(vtuberId) ?? [];

    const totalDurationMs =
      getIntervalsDuration(intervals);

    const otherIntervals = [
      ...intervalMap.entries(),
    ]
      .filter(
        ([otherVtuberId]) =>
          otherVtuberId !== vtuberId,
      )
      .flatMap(([, otherVtuberIntervals]) =>
        otherVtuberIntervals,
      );

    const mergedOtherIntervals =
      mergeIntervals(otherIntervals);

    const overlapWithOthersMs =
      getOverlapDuration(
        intervals,
        mergedOtherIntervals,
      );

    const soloDurationMs = Math.max(
      0,
      totalDurationMs - overlapWithOthersMs,
    );

    const soloRatio =
      totalDurationMs > 0
        ? soloDurationMs / totalDurationMs
        : 0;

    vtuberStatsMap.set(vtuberId, {
      vtuberId,
      vtuberName:
        vtuberStreams[0]?.vtuberName ??
        vtuberId,

      streamCount: vtuberStreams.length,

      totalDurationMs,

      soloDurationMs,
      soloRatio,

      averageDurationMs:
        vtuberStreams.length > 0
          ? vtuberStreams.reduce(
            (total, stream) =>
              total + stream.durationMs,
            0,
          ) / vtuberStreams.length
          : 0,

      overlaps: [],
    });
  }

  const participantIds = [
    ...vtuberStatsMap.keys(),
  ];

  const pairOverlaps: AranamiPairOverlap[] = [];

  for (
    let firstIndex = 0;
    firstIndex < participantIds.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < participantIds.length;
      secondIndex += 1
    ) {
      const firstId =
        participantIds[firstIndex];

      const secondId =
        participantIds[secondIndex];

      const firstStats =
        vtuberStatsMap.get(firstId);

      const secondStats =
        vtuberStatsMap.get(secondId);

      if (!firstStats || !secondStats) {
        continue;
      }

      const firstIntervals =
        intervalMap.get(firstId) ?? [];

      const secondIntervals =
        intervalMap.get(secondId) ?? [];

      const overlapMs =
        getOverlapDuration(
          firstIntervals,
          secondIntervals,
        );

      if (overlapMs <= 0) {
        continue;
      }

      pairOverlaps.push({
        vtuberAId: firstId,
        vtuberAName:
          firstStats.vtuberName,

        vtuberBId: secondId,
        vtuberBName:
          secondStats.vtuberName,

        overlapMs,
      });

      firstStats.overlaps.push({
        vtuberId: secondId,
        vtuberName:
          secondStats.vtuberName,
        overlapMs,
        overlapRatio:
          firstStats.totalDurationMs > 0
            ? overlapMs /
            firstStats.totalDurationMs
            : 0,
      });

      secondStats.overlaps.push({
        vtuberId: firstId,
        vtuberName:
          firstStats.vtuberName,
        overlapMs,
        overlapRatio:
          secondStats.totalDurationMs > 0
            ? overlapMs /
            secondStats.totalDurationMs
            : 0,
      });
    }
  }

  const byVtuber = [
    ...vtuberStatsMap.values(),
  ];

  for (const stats of byVtuber) {
    stats.overlaps.sort(
      (a, b) =>
        b.overlapMs - a.overlapMs,
    );
  }

  byVtuber.sort(
    (a, b) =>
      b.totalDurationMs -
      a.totalDurationMs,
  );

  pairOverlaps.sort(
    (a, b) =>
      b.overlapMs - a.overlapMs,
  );

  const allBroadcastsByVtuber = new Map<
    string,
    AranamiMinecraftStream[]
  >();

  for (const broadcast of allBroadcasts) {
    const current =
      allBroadcastsByVtuber.get(
        broadcast.vtuberId,
      ) ?? [];

    current.push(broadcast);

    allBroadcastsByVtuber.set(
      broadcast.vtuberId,
      current,
    );
  }

  const investmentStats:
    AranamiVtuberInvestmentStats[] =
    byVtuber.map((vtuber) => {
      const vtuberAllBroadcasts =
        allBroadcastsByVtuber.get(
          vtuber.vtuberId,
        ) ?? [];

      const allIntervals =
        vtuberAllBroadcasts.map(
          (broadcast) => ({
            startMs: new Date(
              broadcast.startedAt,
            ).getTime(),

            endMs: broadcast.endedAt
              ? new Date(
                broadcast.endedAt,
              ).getTime()
              : nowMs,
          }),
        );

      const allBroadcastDurationMs =
        getIntervalsDuration(
          mergeIntervals(
            allIntervals,
          ),
        );

      const allBroadcastStreamCount =
        vtuberAllBroadcasts.length;

      const timeInvestmentRatio =
        allBroadcastDurationMs > 0
          ? vtuber.totalDurationMs /
          allBroadcastDurationMs
          : 0;

      const slotInvestmentRatio =
        allBroadcastStreamCount > 0
          ? vtuber.streamCount /
          allBroadcastStreamCount
          : 0;

      return {
        vtuberId: vtuber.vtuberId,
        vtuberName:
          vtuber.vtuberName,

        allBroadcastDurationMs,
        allBroadcastStreamCount,

        aranamiDurationMs:
          vtuber.totalDurationMs,

        aranamiStreamCount:
          vtuber.streamCount,

        timeInvestmentRatio,
        slotInvestmentRatio,
      };
    });

  const totalBroadcastDurationMs =
    streams.reduce(
      (total, stream) =>
        total + stream.durationMs,
      0,
    );

  const allIntervals = [
    ...intervalMap.values(),
  ].flat();

  const coveredDurationMs =
    getIntervalsDuration(
      mergeIntervals(allIntervals),
    );

  const vtuberNameMap = new Map(
    byVtuber.map((stats) => [
      stats.vtuberId,
      stats.vtuberName,
    ]),
  );

  const concurrentStats = getConcurrentStats(
    intervalMap,
    vtuberNameMap,
    coveredDurationMs,
  );

  const concurrentContinuousSegments =
    getConcurrentContinuousSegments(
      intervalMap,
      vtuberNameMap,
    );

  const concurrentCoveredDurationMs =
    concurrentStats.reduce(
      (total, stats) =>
        total + stats.durationMs,
      0,
    );

  if (
    concurrentCoveredDurationMs !==
    coveredDurationMs
  ) {
    console.warn(
      "[aranami-stats] 동시 방송 시간 검산 실패",
      {
        concurrentCoveredDurationMs,
        coveredDurationMs,
      },
    );
  }

  const maxConcurrentParticipants =
    concurrentStats.reduce(
      (maximum, stats) =>
        Math.max(
          maximum,
          stats.participantCount,
        ),
      0,
    );

  return {
    totalStreams: streams.length,
    totalBroadcastDurationMs,
    coveredDurationMs,
    byVtuber,
    pairOverlaps,
    investmentStats,
    concurrentStats,
    concurrentContinuousSegments,
    maxConcurrentParticipants,
    streams,
  };
}