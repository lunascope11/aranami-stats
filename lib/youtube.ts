import { vtubers } from "../data/vtubers";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

type ThumbnailSet = {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
  standard?: { url: string };
  maxres?: { url: string };
};

type ChannelResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
    };
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
  error?: unknown;
};

type PlaylistItemsResponse = {
  items?: Array<{
    contentDetails: {
      videoId: string;
    };
  }>;
  error?: unknown;
};

type VideosResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      liveBroadcastContent: "live" | "upcoming" | "none";
      thumbnails: ThumbnailSet;
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
      concurrentViewers?: string;
    };
  }>;
  error?: unknown;
};

export type YouTubeFeedStatus =
  | "live"
  | "upcoming"
  | "ended"
  | "video";

export type YouTubeFeedItem = {
  id: string;
  vtuberId: string;
  title: string;
  channelTitle: string;
  status: YouTubeFeedStatus;
  publishedAt: string;
  scheduledAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  thumbnail?: string;
  concurrentViewers?: number;
  youtubeUrl: string;
};

function extractYoutubeHandle(youtubeUrl: string): string {
  const pathname = new URL(youtubeUrl).pathname;

  const handle = pathname
    .split("/")
    .filter(Boolean)
    .find((part) => part.startsWith("@"));

  if (!handle) {
    throw new Error(
      `YouTube URL에서 핸들을 찾지 못했습니다: ${youtubeUrl}`,
    );
  }

  return handle;
}

function getThumbnail(thumbnails: ThumbnailSet): string | undefined {
  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url
  );
}

function getStatus(
  video: NonNullable<VideosResponse["items"]>[number],
): YouTubeFeedStatus {
  if (video.snippet.liveBroadcastContent === "live") {
    return "live";
  }

  if (video.snippet.liveBroadcastContent === "upcoming") {
    return "upcoming";
  }

  if (
    video.liveStreamingDetails?.actualStartTime ||
    video.liveStreamingDetails?.scheduledStartTime
  ) {
    return "ended";
  }

  return "video";
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
        revalidate: 300,
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

export async function getYouTubeFeed(): Promise<YouTubeFeedItem[]> {
  const videoReferences = await Promise.all(
    vtubers.map(async (vtuber) => {
      const handle = extractYoutubeHandle(vtuber.youtubeUrl);

      const channelResponse = await youtubeRequest<ChannelResponse>(
        "channels",
        {
          part: "snippet,contentDetails",
          forHandle: handle,
        },
      );

      const channel = channelResponse.items?.[0];

      if (!channel) {
        throw new Error(`${handle} 채널을 찾지 못했습니다.`);
      }

      const uploadsPlaylistId =
        channel.contentDetails.relatedPlaylists.uploads;

      const playlistResponse =
        await youtubeRequest<PlaylistItemsResponse>("playlistItems", {
          part: "contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: "8",
        });

      return (playlistResponse.items ?? []).map((item) => ({
        videoId: item.contentDetails.videoId,
        vtuberId: vtuber.id,
      }));
    }),
  );

  const flattenedReferences = videoReferences.flat();

  const videoOwnerMap = new Map<string, string>();

  for (const reference of flattenedReferences) {
    videoOwnerMap.set(reference.videoId, reference.vtuberId);
  }

  const videoIds = [...videoOwnerMap.keys()];

  if (videoIds.length === 0) {
    return [];
  }

  const videoIdBatches: string[][] = [];

  for (let index = 0; index < videoIds.length; index += 50) {
    videoIdBatches.push(
      videoIds.slice(index, index + 50),
    );
  }

  const videosResponses = await Promise.all(
    videoIdBatches.map((batch) =>
      youtubeRequest<VideosResponse>("videos", {
        part: "snippet,liveStreamingDetails",
        id: batch.join(","),
        maxResults: "50",
      }),
    ),
  );

const videos = videosResponses.flatMap(
  (response) => response.items ?? [],
);

const feed = videos.map((video) => ({
    id: video.id,
    vtuberId: videoOwnerMap.get(video.id) ?? "unknown",
    title: video.snippet.title,
    channelTitle: video.snippet.channelTitle,
    status: getStatus(video),
    publishedAt: video.snippet.publishedAt,
    scheduledAt: video.liveStreamingDetails?.scheduledStartTime,
    actualStartAt: video.liveStreamingDetails?.actualStartTime,
    actualEndAt: video.liveStreamingDetails?.actualEndTime,
    thumbnail: getThumbnail(video.snippet.thumbnails),
    concurrentViewers: video.liveStreamingDetails?.concurrentViewers
      ? Number(video.liveStreamingDetails.concurrentViewers)
      : undefined,
    youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
  }));

  return feed.sort((a, b) => {
    const aTime =
      a.scheduledAt ?? a.actualStartAt ?? a.publishedAt;

    const bTime =
      b.scheduledAt ?? b.actualStartAt ?? b.publishedAt;

    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}