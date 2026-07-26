export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "v0.1.0",
    date: "2026-07-24",
    title: "VTuber Hub 첫 기준 버전",
    changes: [
      "버튜버 명부 및 개인 페이지",
      "YouTube 방송 정보 표시",
      "관심 방송 직접 추가 기능",
      "수동 방송 일정 및 월간 달력",
      "홈 화면 방송 일정 표시",
      "Google 로그인",
      "Supabase 계정별 데이터 동기화",
      "비로그인 localStorage 저장",
      "localStorage 데이터를 계정으로 가져오는 기능",
      "X 기록 라이버 목록 및 개인 페이지",
      "X Embed 기능 기반 구현",
      "Git 버전 관리 도입",
      "Vercel Production 배포",
    ],
  },
];