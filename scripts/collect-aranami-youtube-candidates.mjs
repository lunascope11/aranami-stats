import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = path.join(
  process.cwd(),
  "data",
  "aranami-candidates.json",
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "aranami-youtube-review.json",
);

const REQUEST_DELAY_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeYoutubeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    const hostname = url.hostname.replace(
      /^www\./,
      "",
    );

    if (
      hostname !== "youtube.com" &&
      hostname !== "m.youtube.com"
    ) {
      return undefined;
    }

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    const handle = parts.find((part) =>
      part.startsWith("@"),
    );

    if (!handle) {
      return undefined;
    }

    return `https://www.youtube.com/${handle}`;
  } catch {
    return undefined;
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VTuberHub/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function extractYoutubeCandidates(html) {
  const $ = cheerio.load(html);

  const candidates = new Set();

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");

    if (!href) {
      return;
    }

    if (!href.includes("youtube.com")) {
      return;
    }

    const normalized =
      normalizeYoutubeUrl(href);

    if (normalized) {
      candidates.add(normalized);
    }
  });

  return [...candidates];
}

async function main() {
  const inputText = await fs.readFile(
    INPUT_PATH,
    "utf8",
  );

  const participants =
    JSON.parse(inputText);

  const collected = [];

  for (
    let index = 0;
    index < participants.length;
    index += 1
  ) {
    const participant =
      participants[index];

    console.log(
      `[${index + 1}/${participants.length}] ${participant.name}`,
    );

    try {
      const html = await fetchHtml(
        participant.sourceUrl,
      );

      const youtubeCandidates =
        extractYoutubeCandidates(html);

      console.log(
        `   YouTube 후보 ${youtubeCandidates.length}개`,
      );

      collected.push({
        ...participant,
        youtubeCandidates,
      });
    } catch (error) {
      console.warn(
        "   ⚠ 수집 실패:",
        error instanceof Error
          ? error.message
          : error,
      );

      collected.push({
        ...participant,
        youtubeCandidates: [],
      });
    }

    await sleep(REQUEST_DELAY_MS);
  }

  // 각 YouTube URL이 몇 명에게서 등장했는지 계산
  const urlCounts = new Map();

  for (const participant of collected) {
    for (const url of participant.youtubeCandidates) {
      urlCounts.set(
        url,
        (urlCounts.get(url) ?? 0) + 1,
      );
    }
  }

  const reviewData = collected.map(
    (participant) => {
      const candidates =
        participant.youtubeCandidates.map(
          (url) => ({
            url,
            sharedCount:
              urlCounts.get(url) ?? 1,

            // 여러 라이버 문서에서 공통으로 등장하면
            // 공식/유닛 채널일 가능성이 높다고 판단
            likelySharedChannel:
              (urlCounts.get(url) ?? 1) > 1,
          }),
        );

      const personalCandidates =
        candidates.filter(
          (candidate) =>
            !candidate.likelySharedChannel,
        );

      const suggestedYoutubeUrl =
        personalCandidates.length === 1
          ? personalCandidates[0].url
          : "";

      return {
        id: participant.id,
        name: participant.name,
        debutYear:
          participant.debutYear,
        gender: participant.gender,
        eligible: participant.eligible,

        suggestedYoutubeUrl,

        youtubeCandidates:
          candidates,

        participant: false,
        verified: false,
        sourceUrl:
          participant.sourceUrl,
      };
    },
  );

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      reviewData,
      null,
      2,
    ),
    "utf8",
  );

  const suggestedCount =
    reviewData.filter(
      (participant) =>
        participant.suggestedYoutubeUrl,
    ).length;

  console.log("\n================");
  console.log(
    `전체: ${reviewData.length}명`,
  );
  console.log(
    `자동 추천 성공: ${suggestedCount}명`,
  );
  console.log(
    `직접 확인 필요: ${
      reviewData.length -
      suggestedCount
    }명`,
  );
  console.log(
    `저장 완료: ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});