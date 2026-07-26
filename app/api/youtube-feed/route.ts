import { NextResponse } from "next/server";
import { getYouTubeFeed } from "../../../lib/youtube";

export async function GET() {
  try {
    const feed = await getYouTubeFeed();

    return NextResponse.json({
      ok: true,
      count: feed.length,
      summary: {
        live: feed.filter((item) => item.status === "live").length,
        upcoming: feed.filter(
          (item) => item.status === "upcoming",
        ).length,
        ended: feed.filter((item) => item.status === "ended").length,
        video: feed.filter((item) => item.status === "video").length,
      },
      items: feed,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}