import { NextResponse } from "next/server";
import { vtubers } from "../../../data/vtubers";

type YoutubeChannelResponse = {
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

function extractYoutubeHandle(youtubeUrl: string): string {
  const pathname = new URL(youtubeUrl).pathname;

  const firstPart = pathname
    .split("/")
    .filter(Boolean)[0];

  if (!firstPart?.startsWith("@")) {
    throw new Error(
      `YouTube URL에서 핸들을 찾지 못했습니다: ${youtubeUrl}`,
    );
  }

  return firstPart;
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "YOUTUBE_API_KEY가 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  const vtuber = vtubers[0];

  if (!vtuber) {
    return NextResponse.json(
      {
        ok: false,
        error: "등록된 버튜버가 없습니다.",
      },
      { status: 404 },
    );
  }

  let handle: string;

  try {
    handle = extractYoutubeHandle(vtuber.youtubeUrl);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "YouTube 핸들을 확인하지 못했습니다.",
      },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    forHandle: handle,
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params}`,
    {
      cache: "no-store",
    },
  );

  const data =
    (await response.json()) as YoutubeChannelResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "YouTube API 요청에 실패했습니다.",
        details: data.error,
      },
      { status: response.status },
    );
  }

  const channel = data.items?.[0];

  if (!channel) {
    return NextResponse.json(
      {
        ok: false,
        error: `${handle} 채널을 찾지 못했습니다.`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    input: {
      siteId: vtuber.id,
      siteName: vtuber.name,
      youtubeHandle: handle,
    },
    youtube: {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      uploadsPlaylistId:
        channel.contentDetails.relatedPlaylists.uploads,
    },
  });
}