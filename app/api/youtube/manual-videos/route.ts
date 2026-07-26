import { NextResponse } from "next/server";

const YOUTUBE_API_BASE =
  "https://www.googleapis.com/youtube/v3";

type ThumbnailSet = {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
  standard?: { url: string };
  maxres?: { url: string };
};

type VideosResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      liveBroadcastContent:
        | "live"
        | "upcoming"
        | "none";
      thumbnails: ThumbnailSet;
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
      concurrentViewers?: string;
    };
  }>;
};

type ManualVideoStatus =
  | "live"
  | "upcoming"
  | "ended"
  | "video";

function extractVideoId(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");
  const pathParts = url.pathname
    .split("/")
    .filter(Boolean);

  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    videoId = pathParts[0] ?? null;
  }

  if (
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    }

    if (
      pathParts[0] === "live" ||
      pathParts[0] === "shorts" ||
      pathParts[0] === "embed"
    ) {
      videoId = pathParts[1] ?? null;
    }
  }

  if (
    !videoId ||
    !/^[A-Za-z0-9_-]{11}$/.test(videoId)
  ) {
    return null;
  }

  return videoId;
}

function getThumbnail(thumbnails: ThumbnailSet) {
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
): ManualVideoStatus {
  if (
    video.snippet.liveBroadcastContent === "live"
  ) {
    return "live";
  }

  if (
    video.snippet.liveBroadcastContent === "upcoming"
  ) {
    return "upcoming";
  }

  if (
    video.liveStreamingDetails?.actualEndTime
  ) {
    return "ended";
  }

  if (
    video.liveStreamingDetails?.scheduledStartTime &&
    !video.liveStreamingDetails?.actualStartTime
  ) {
    return "upcoming";
  }

  if (
    video.liveStreamingDetails?.actualStartTime
  ) {
    return "live";
  }

  return "video";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      urls?: unknown;
    };

    if (!Array.isArray(body.urls)) {
      return NextResponse.json(
        {
          error:
            "YouTube 링크 목록이 필요합니다.",
        },
        { status: 400 },
      );
    }

    const urls = body.urls.filter(
      (value): value is string =>
        typeof value === "string",
    );

    const videoIds = [
      ...new Set(
        urls
          .map(extractVideoId)
          .filter(
            (id): id is string => id !== null,
          ),
      ),
    ].slice(0, 50);

    if (videoIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "올바른 YouTube 방송 링크를 찾지 못했습니다.",
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "YOUTUBE_API_KEY가 설정되지 않았습니다.",
        },
        { status: 500 },
      );
    }

    const searchParameters = new URLSearchParams({
      part: "snippet,liveStreamingDetails",
      id: videoIds.join(","),
      key: apiKey,
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?${searchParameters.toString()}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: `YouTube API 요청 실패: ${errorText}`,
        },
        { status: response.status },
      );
    }

    const data =
      (await response.json()) as VideosResponse;

    const items = (data.items ?? []).map(
      (video) => ({
        id: video.id,
        title: video.snippet.title,
        channelTitle:
          video.snippet.channelTitle,
        status: getStatus(video),
        publishedAt:
          video.snippet.publishedAt,
        scheduledAt:
          video.liveStreamingDetails
            ?.scheduledStartTime,
        actualStartAt:
          video.liveStreamingDetails
            ?.actualStartTime,
        actualEndAt:
          video.liveStreamingDetails
            ?.actualEndTime,
        concurrentViewers:
          video.liveStreamingDetails
            ?.concurrentViewers
            ? Number(
                video.liveStreamingDetails
                  .concurrentViewers,
              )
            : undefined,
        thumbnail: getThumbnail(
          video.snippet.thumbnails,
        ),
        youtubeUrl:
          `https://www.youtube.com/watch?v=${video.id}`,
      }),
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "방송 정보를 가져오는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}