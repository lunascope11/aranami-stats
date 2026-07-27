export const currentVersion = "0.1.0";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2026-07-27",
    title: "Initial Release",
    changes: [
      "あらなみマイクラ 전체 방송 통계",
      "라이버별 방송 시간 및 방송 횟수",
      "라이버별 단독 방송 시간 및 비율",
      "라이버별 전체 방송 대비 あらなみマイクラ 투자율",
      "동시 방송 인원별 누적 시간 통계",
      "동시 방송 인원별 연속 유지 시간 통계",
      "동시 방송 멤버 조합 상세 통계",
      "라이버 페어별 동시 방송 시간 통계",
      "참가자 이름 일본어 공식 표기로 통일",
    ],
  },
];