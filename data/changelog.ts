

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "0.1.4",
    date: "2026-07-27",
    title: "참가자 수정",
    changes: [
      "빠진 참가자 추가",
      "잘못 포함된 참가자 정리",
      "contentDetails.duration 추가",
      "duration 비교용 디버그 로그",
    ],
  },
  {
    version: "0.1.3",
    date: "2026-07-27",
    title: "사이트 안내사항 추가",
    changes: [
      "사이트 하단에 비공식 팬 사이트 안내 문구 추가",
    ],
  },
  {
    version: "0.1.2",
    date: "2026-07-27",
    title: "사이트 아이콘 업데이트",
    changes: [
      "Aranami Stats 사이트 아이콘 및 파비콘 변경",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-07-27",
    title: "초기 공개 준비",
    changes: [
      "참가자 이름을 일본어 공식 표기로 변경",
      "사이트 하단에 현재 버전 표시 추가",
      "버전별 업데이트 내역 페이지 추가",
      "업데이트 로그 관리 구조 추가",
    ],
  },
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