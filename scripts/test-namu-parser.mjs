import * as cheerio from "cheerio";

const SOURCE_BASES = [
  "https://namu.wiki/w/",
  "https://namu.moe/w/",
];

async function fetchWikiPage(title) {
  let lastError;

  for (const baseUrl of SOURCE_BASES) {
    const url = `${baseUrl}${encodeURIComponent(title)}`;

    try {
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

      const html = await response.text();

      return {
        html,
        sourceUrl: url,
      };
    } catch (error) {
      lastError = error;

      console.warn(
        `불러오기 실패: ${url}`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }

  throw new Error(
    `문서를 가져오지 못했습니다: ${title}\n${String(
      lastError,
    )}`,
  );
}

function parseParticipant(title, html) {
  const $ = cheerio.load(html);

  // HTML 구조가 조금 바뀌어도 버틸 수 있도록
  // 페이지 전체 텍스트에서 우선 추출
  const pageText = $.root()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const genderMatch = pageText.match(
    /성별\s*(여성|남성)/,
  );

  const debutMatch = pageText.match(
    /데뷔\s*(\d{4})년/,
  );

  const gender =
    genderMatch?.[1] === "여성"
      ? "female"
      : genderMatch?.[1] === "남성"
        ? "male"
        : "unknown";

  const debutYear = debutMatch
    ? Number(debutMatch[1])
    : undefined;

  const eligible =
    gender === "female" &&
    debutYear !== undefined &&
    debutYear >= 2022;

  return {
    name: title,
    gender,
    debutYear,
    eligible,
  };
}

async function main() {
  const testTitles = [
    "시가 리코",
    "후우라 카나토",
  ];

  for (const title of testTitles) {
    const { html, sourceUrl } =
      await fetchWikiPage(title);

    const result = parseParticipant(
      title,
      html,
    );

    console.log("\n----------------");
    console.log(result);
    console.log("source:", sourceUrl);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});