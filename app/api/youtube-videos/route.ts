import { NextResponse } from "next/server";

const YOUTUBE_API_BASE =
  "https://www.googleapis.com/youtube/v3/videos";

const MAX_IDS_PER_REQUEST = 500;
const YOUTUBE_CHUNK_SIZE = 50;

type YouTubeSnippet = {
  publishedAt?: string;
  channelId?: string;
  title?: string;
  description?: string;
  channelTitle?: string;
  tags?: string[];
  categoryId?: string;
};

type YouTubeVideo = {
  id?: string;
  snippet?: YouTubeSnippet;
  contentDetails?: {
    duration?: string;
  };
  liveStreamingDetails?: Record<string, unknown>;
};

function parseDurationSeconds(
  duration: string | undefined,
) {
  if (!duration) {
    return 0;
  }

  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );

  if (!match) {
    return 0;
  }

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);

  return (
    days * 24 * 60 * 60 +
    hours * 60 * 60 +
    minutes * 60 +
    seconds
  );
}

function splitIntoChunks<T>(
  values: T[],
  chunkSize: number,
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += chunkSize
  ) {
    chunks.push(
      values.slice(index, index + chunkSize),
    );
  }

  return chunks;
}

function hasShortsHint(
  snippet: YouTubeSnippet,
) {
  const title = snippet.title ?? "";
  const description =
    snippet.description ?? "";

  const metadataText =
    `${title}\n${description}`;

  const hashtagFound =
    /#shorts?(?:\b|$)/i.test(metadataText);

  const shortsTagFound =
    (snippet.tags ?? []).some((tag) => {
      const normalizedTag = tag
        .trim()
        .toLowerCase()
        .replace(/^#/, "");

      return (
        normalizedTag === "short" ||
        normalizedTag === "shorts"
      );
    });

  return hashtagFound || shortsTagFound;
}

export async function POST(
  request: Request,
) {
  try {
    const apiKey =
      process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "YOUTUBE_API_KEY가 설정되지 않았습니다.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      ids?: unknown;
    };

    if (!Array.isArray(body.ids)) {
      return NextResponse.json(
        {
          error:
            "ids 배열이 필요합니다.",
        },
        { status: 400 },
      );
    }

    const ids = [
      ...new Set(
        body.ids
          .filter(
            (
              value,
            ): value is string =>
              typeof value === "string",
          )
          .map((value) => value.trim())
          .filter((value) =>
            /^[A-Za-z0-9_-]{11}$/.test(
              value,
            ),
          ),
      ),
    ].slice(0, MAX_IDS_PER_REQUEST);

    if (ids.length === 0) {
      return NextResponse.json({
        items: [],
        missingIds: [],
      });
    }

    const chunks = splitIntoChunks(
      ids,
      YOUTUBE_CHUNK_SIZE,
    );

    const chunkResults =
      await Promise.all(
        chunks.map(async (chunk) => {
          const url = new URL(
            YOUTUBE_API_BASE,
          );

          url.searchParams.set(
            "part",
            [
              "snippet",
              "contentDetails",
              "liveStreamingDetails",
            ].join(","),
          );

          url.searchParams.set(
            "id",
            chunk.join(","),
          );

          url.searchParams.set(
            "key",
            apiKey,
          );

          const response = await fetch(
            url,
            {
              cache: "no-store",
            },
          );

          if (!response.ok) {
            const responseText =
              await response.text();

            throw new Error(
              `YouTube API 오류 (${response.status}): ${responseText}`,
            );
          }

          const data =
            (await response.json()) as {
              items?: YouTubeVideo[];
            };

          return data.items ?? [];
        }),
      );

    const videos =
      chunkResults.flat();

    const returnedIds = new Set(
      videos
        .map((video) => video.id)
        .filter(
          (
            id,
          ): id is string =>
            typeof id === "string",
        ),
    );

    const items = videos.flatMap(
      (video) => {
        if (!video.id) {
          return [];
        }

        const snippet =
          video.snippet ?? {};

        return [
          {
            id: video.id,

            title:
              snippet.title ??
              "(제목 없음)",

            channelId:
              snippet.channelId ??
              null,

            channelTitle:
              snippet.channelTitle ??
              "(채널 정보 없음)",

            durationSeconds:
              parseDurationSeconds(
                video.contentDetails
                  ?.duration,
              ),

            publishedAt:
              snippet.publishedAt ??
              null,

            categoryId:
              snippet.categoryId ??
              null,

            hasShortsHint:
              hasShortsHint(snippet),

            isLiveBroadcast: Boolean(
              video.liveStreamingDetails,
            ),
          },
        ];
      },
    );

    const missingIds = ids.filter(
      (id) => !returnedIds.has(id),
    );

    return NextResponse.json({
      items,
      missingIds,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "영상 정보를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}