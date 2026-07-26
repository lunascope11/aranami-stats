import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";

const LIST_PAGE_TITLE = "니지산지/라이버 목록";

const SOURCE_BASES = [
  "https://namu.wiki/w/",
  "https://namu.moe/w/",
];

const START_YEAR = 2022;
const END_YEAR = new Date().getFullYear();

const REQUEST_DELAY_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\[\d+\]/g, "")
    .trim();
}

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
    `${title} 문서를 가져오지 못했습니다.\n${String(
      lastError,
    )}`,
  );
}

function getHeadingLevel(element) {
  const tagName = element.tagName?.toLowerCase();

  if (!tagName?.match(/^h[1-6]$/)) {
    return undefined;
  }

  return Number(tagName.slice(1));
}

/**
 * 특정 연도 제목 아래의 개인 문서 링크를 찾음.
 */
function collectLinksFromYearSection($, year) {
  const targetText = `${year}년`;

  const links = [];
  const seen = new Set();

  let collecting = false;
  let targetHeadingLevel;

  const elements = $(
    "h1, h2, h3, h4, h5, h6, a[href]",
  ).toArray();

  for (const element of elements) {
    const tagName =
      element.tagName?.toLowerCase();

    const isHeading =
      tagName?.match(/^h[1-6]$/);

    if (isHeading) {
      const level = Number(
        tagName.slice(1),
      );

      const text = normalizeText(
        $(element).text(),
      );

      // 원하는 연도 섹션 시작
      if (text.includes(targetText)) {
        collecting = true;
        targetHeadingLevel = level;
        continue;
      }

      // 원하는 연도 섹션을 읽다가
      // 같은 레벨 또는 상위 제목을 만나면 종료
      if (
        collecting &&
        targetHeadingLevel !== undefined &&
        level <= targetHeadingLevel
      ) {
        break;
      }

      continue;
    }

    if (!collecting) {
      continue;
    }

    const href = $(element).attr("href");

    if (!href) {
      continue;
    }

    let title;

    try {
      // 상대 URL
      if (href.startsWith("/w/")) {
        title = decodeURIComponent(
          href
            .split("#")[0]
            .replace(/^\/w\//, ""),
        );
      }

      // 절대 URL도 대응
      else if (
        href.startsWith(
          "https://namu.wiki/w/",
        ) ||
        href.startsWith(
          "https://namu.moe/w/",
        )
      ) {
        const url = new URL(href);

        title = decodeURIComponent(
          url.pathname.replace(
            /^\/w\//,
            "",
          ),
        );
      }
    } catch {
      continue;
    }

    if (!title) {
      continue;
    }

    const text = normalizeText(
      $(element).text(),
    );

    if (!text) {
      continue;
    }

    // 라이버 이외의 보조 문서 제거
    if (
      title.startsWith("파일:") ||
      title.startsWith("분류:") ||
      title.startsWith("틀:") ||
      title.startsWith("니지산지/") ||
      title === "니지산지"
    ) {
      continue;
    }

    // 자기 자신 / 목차 링크 등 제거
    if (
      title === "니지산지/라이버 목록"
    ) {
      continue;
    }

    if (seen.has(title)) {
      continue;
    }

    seen.add(title);

    links.push({
      title,
      displayName: text,
      yearFromList: year,
    });
  }

  return links;
}

function parseParticipant(
  title,
  html,
  yearFromList,
  sourceUrl,
) {
  const $ = cheerio.load(html);

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
    : yearFromList;

  let youtubeUrl;

  $('a[href*="youtube.com"]').each(
    (_, anchor) => {
      if (youtubeUrl) {
        return;
      }

      const href = $(anchor).attr("href");

      if (!href) {
        return;
      }

      // 현재 사이트 코드가 @handle URL을 사용하므로
      // 우선 handle 형태만 자동 채움.
      if (
        href.includes("youtube.com/@")
      ) {
        youtubeUrl = href;
      }
    },
  );

  const eligible =
    gender === "female" &&
    debutYear >= START_YEAR;

  return {
    id: "",
    name: title,
    youtubeUrl: youtubeUrl ?? "",
    debutYear,
    gender,
    eligible,

    // 아래 두 값은 직접 검수 후 변경
    participant: false,
    verified: false,

    sourceUrl,
  };
}

async function main() {
  console.log(
    "니지산지 라이버 목록을 불러오는 중...",
  );

  const {
    html: listHtml,
    sourceUrl: listSourceUrl,
  } = await fetchWikiPage(
    LIST_PAGE_TITLE,
  );

  console.log(
    `목록 출처: ${listSourceUrl}`,
  );

  const $ = cheerio.load(listHtml);

  const candidateMap = new Map();

  for (
    let year = START_YEAR;
    year <= END_YEAR;
    year += 1
  ) {
    const links =
      collectLinksFromYearSection(
        $,
        year,
      );

    console.log(
      `${year}: ${links.length}명 발견`,
    );

    for (const link of links) {
      if (!candidateMap.has(link.title)) {
        candidateMap.set(
          link.title,
          link,
        );
      }
    }
  }

  const candidates = [
    ...candidateMap.values(),
  ];

  console.log(
    `\n개인 문서 확인 대상: ${candidates.length}명`,
  );

  if (candidates.length === 0) {
    console.log(
      "\n⚠ 라이버를 한 명도 찾지 못했습니다.",
    );

    console.log(
      "현재 페이지에서 발견된 제목:",
    );

    $("h1, h2, h3, h4, h5, h6").each(
      (_, heading) => {
        console.log(
          "-",
          normalizeText(
            $(heading).text(),
          ),
        );
      },
    );

    return;
  }

  const results = [];

  for (
    let index = 0;
    index < candidates.length;
    index += 1
  ) {
    const candidate =
      candidates[index];

    console.log(
      `[${index + 1}/${candidates.length}] ${candidate.title}`,
    );

    try {
      const {
        html,
        sourceUrl,
      } = await fetchWikiPage(
        candidate.title,
      );

      const parsed =
        parseParticipant(
          candidate.title,
          html,
          candidate.yearFromList,
          sourceUrl,
        );

      console.log(
        `   ${parsed.gender} / ${parsed.debutYear} / eligible=${parsed.eligible}`,
      );

      results.push(parsed);
    } catch (error) {
      console.warn(
        `   ⚠ 파싱 실패:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }

    await sleep(REQUEST_DELAY_MS);
  }

  // 이번 목적에서는 여성 + 2022년 이후만 남김
  const eligibleCandidates =
    results
      .filter(
        (candidate) =>
          candidate.eligible,
      )
      .sort((a, b) => {
        if (
          a.debutYear !== b.debutYear
        ) {
          return (
            a.debutYear -
            b.debutYear
          );
        }

        return a.name.localeCompare(
          b.name,
          "ko",
        );
      });

  const outputPath = path.join(
    process.cwd(),
    "data",
    "aranami-candidates.json",
  );

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      eligibleCandidates,
      null,
      2,
    ),
    "utf8",
  );

  console.log("\n================");
  console.log(
    `전체 검사: ${results.length}명`,
  );
  console.log(
    `조건 충족: ${eligibleCandidates.length}명`,
  );
  console.log(
    `저장 완료: ${outputPath}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});