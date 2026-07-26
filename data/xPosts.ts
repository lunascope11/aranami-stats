export type XPostCategory =
  | "announcement"
  | "important"
  | "saved";

export type XPostRecord = {
  id: string;
  vtuberId: string;
  text: string;
  postedAt: string;
  postUrl: string;
  category: XPostCategory;
  imageUrl?: string;
};

export const xPosts: XPostRecord[] = [
    {
        id: "kotone-post-2079522021726122428",
        vtuberId: "mikogami-kotone",
        text:
            "【✨ショート切り抜き動画投稿のお知らせ✨】\n可愛らしい恥じらいがある御子神琴音\n#琴音をひとつまみ",
        postedAt: "2026-07-21T20:01:00+09:00",
        postUrl:
            "https://x.com/Mikogami_Kotone/status/2079522021726122428",
        category: "announcement",
    },
  {
    id: "meruto-post-20260721-1",
    vtuberId: "kuramoti-meruto",
    text: "나중에 다시 보고 싶은 중요한 게시물 예시입니다.",
    postedAt: "2026-07-21T18:10:00+09:00",
    postUrl: "https://x.com/k_meruto",
    category: "important",
  },
  {
    id: "sophia-post-20260720-1",
    vtuberId: "sophia-valentine",
    text: "개인적으로 저장해둔 게시물 예시입니다.",
    postedAt: "2026-07-20T22:00:00+09:00",
    postUrl: "https://x.com/SophiaV214",
    category: "saved",
  },
];