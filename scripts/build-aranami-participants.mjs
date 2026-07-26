import fs from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = path.join(
  process.cwd(),
  "data",
  "aranami-youtube-review.json",
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "aranami-participants.ts",
);

function makeId(youtubeUrl) {
  const url = new URL(youtubeUrl);

  const parts = url.pathname
    .split("/")
    .filter(Boolean);

  const handle = parts.find((part) =>
    part.startsWith("@"),
  );

  if (handle) {
    return handle.slice(1);
  }

  const channelIndex =
    parts.indexOf("channel");

  const channelId =
    channelIndex >= 0
      ? parts[channelIndex + 1]
      : undefined;

  if (channelId) {
    return channelId;
  }

  throw new Error(
    `YouTube URL에서 ID를 만들 수 없습니다: ${youtubeUrl}`,
  );
}

async function main() {
  const raw = await fs.readFile(
    INPUT_PATH,
    "utf8",
  );

  const reviewData = JSON.parse(raw);

  const participants = reviewData.map(
    (item) => {
      if (!item.suggestedYoutubeUrl) {
        throw new Error(
          `${item.name}: YouTube URL이 비어 있습니다.`,
        );
      }

      return {
        id: makeId(
          item.suggestedYoutubeUrl,
        ),

        name: item.name,

        youtubeUrl:
          item.suggestedYoutubeUrl,

        debutYear:
          item.debutYear,

        gender:
          item.gender,

        eligible:
          item.eligible,

        // 이번 あらなみ 통계 대상 풀에 포함
        participant: true,

        // YouTube URL까지 직접 검수한 데이터
        verified: true,
      };
    },
  );

  const ids = participants.map(
    (participant) => participant.id,
  );

  const duplicateIds = ids.filter(
    (id, index) =>
      ids.indexOf(id) !== index,
  );

  if (duplicateIds.length > 0) {
    throw new Error(
      `중복 ID 발견: ${[
        ...new Set(duplicateIds),
      ].join(", ")}`,
    );
  }

  const content = `export type AranamiParticipant = {
  id: string;
  name: string;
  youtubeUrl: string;
  debutYear?: number;
  gender?: "female" | "male" | "unknown";
  eligible: boolean;
  participant: boolean;
  verified: boolean;
};

export const aranamiParticipants: AranamiParticipant[] = ${JSON.stringify(
    participants,
    null,
    2,
  )};
`;

  await fs.writeFile(
    OUTPUT_PATH,
    content,
    "utf8",
  );

  console.log("================");
  console.log(
    `참가자: ${participants.length}명`,
  );
  console.log(
    `고유 ID: ${new Set(ids).size}개`,
  );
  console.log(
    `저장 완료: ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});