export type VtuberDetail = {
  label: string;
  value: string;
};

export type Vtuber = {
  id: string;
  name: string;
  reading: string;
  group: string;
  youtubeUrl: string;
  xUrl: string;
  shopUrl?: string;
  wiki: string;
  profileImage: string;
  details?: VtuberDetail[];
};

export const vtubers: Vtuber[] = [
  {
    id: "mikogami-kotone",
    name: "御子神琴音",
    reading: "みこがみことね",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@MikogamiKotone_Y4T4",
    xUrl: "https://x.com/Mikogami_Kotone",
    shopUrl: "https://shop.nijisanji.jp/1185",
    wiki: "https://wikiwiki.jp/nijisanji/%E5%BE%A1%E5%AD%90%E7%A5%9E%E7%90%B4%E9%9F%B3",
    profileImage: "/profiles/mikogami-kotone.jpg",
    details: [
      {
        label: "데뷔",
        value: "여기에 데뷔일 입력",
      },
      {
        label: "생일",
        value: "여기에 생일 입력",
      },
      {
        label: "메모",
        value: "**청소도 안하고 씻지도 않는** 영애 라이버.",
      },
    ],
  },
  {
    id: "ginjo-saine",
    name: "銀城サイネ",
    reading: "ぎんじょうさいね",
    group: "ぶいすぽ",
    youtubeUrl: "https://www.youtube.com/@Saine_Ginjo",
    xUrl: "https://x.com/saine_ginjo",
    wiki: "https://wikiwiki.jp/vspo/%E9%8A%80%E5%9F%8E%E3%82%B5%E3%82%A4%E3%83%8D",
    profileImage: "/profiles/ginjo-saine.jpg",
    details: [
      {
        label: "데뷔",
        value: "여기에 데뷔일 입력",
      },
      {
        label: "생일",
        value: "여기에 생일 입력",
      },
      {
        label: "메모",
        value: "여기에 원하는 설명 입력",
      },
    ],
  },
  {
    id: "ishigami-nozomi",
    name: "石神のぞみ",
    reading: "いしがみのぞみ",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@IshigamiNozomi",
    xUrl: "https://x.com/I_Nozomi_",
    shopUrl: "https://shop.nijisanji.jp/1133",
    wiki: "https://wikiwiki.jp/nijisanji/%E7%9F%B3%E7%A5%9E%E3%81%AE%E3%81%9E%E3%81%BF",
    profileImage: "/profiles/ishigami-nozomi.jpg",
    details: [
      {
        label: "데뷔",
        value: "여기에 데뷔일 입력",
      },
      {
        label: "생일",
        value: "여기에 생일 입력",
      },
      {
        label: "메모",
        value: "악마와 인간의 하프 **라고 주장하는** 니지산지 라이버.",
      },
    ],
  },
  {
    id: "kuramoti-meruto",
    name: "倉持めると",
    reading: "くらもちめると",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@KuramochiMeruto",
    xUrl: "https://x.com/k_meruto",
    shopUrl: "https://shop.nijisanji.jp/1135",
    wiki: "https://wikiwiki.jp/nijisanji/%E5%80%89%E6%8C%81%E3%82%81%E3%82%8B%E3%81%A8",
    profileImage: "/profiles/kuramoti-meruto.jpg",
  },
  {
    id: "sophia-valentine",
    name: "ソフィア・ヴァレンタイン",
    reading: "そふぃあ・ゔぁれんたいん",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@Sophia_Valentine",
    xUrl: "https://x.com/SophiaV214",
    shopUrl: "https://shop.nijisanji.jp/1138",
    wiki: "https://wikiwiki.jp/nijisanji/%E3%82%BD%E3%83%95%E3%82%A3%E3%82%A2%E3%83%BB%E3%83%B4%E3%82%A1%E3%83%AC%E3%83%B3%E3%82%BF%E3%82%A4%E3%83%B3",
    profileImage: "/profiles/sophia-valentine.jpg",
  },
  {
    id: "shirasa-ayane",
    name: "白砂あやね",
    reading: "しらさあやね",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@ShirasaAyane",
    xUrl: "https://x.com/shirasa_ayane",
    wiki: "https://wikiwiki.jp/nijisanji/%E7%99%BD%E7%A0%82%E3%81%82%E3%82%84%E3%81%AD",
    profileImage: "/profiles/shirasa-ayane.jpg",
  },
  {
    id: "shioriha-ruri",
    name: "栞葉るり",
    reading: "しおりはるり",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@ShiorihaRuri",
    xUrl: "https://x.com/Ruri_4ori8",
    shopUrl: "https://shop.nijisanji.jp/1154",
    wiki: "https://wikiwiki.jp/nijisanji/%E6%A0%9E%E8%91%89%E3%82%8B%E3%82%8A",
    profileImage: "/profiles/shioriha-ruri.jpg",
  },
  {
    id: "lize-helesta",
    name: "リゼ・ヘルエスタ",
    reading: "りぜ・へるえすた",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@LizeHelesta",
    xUrl: "https://x.com/Lize_Helesta",
    shopUrl: "https://shop.nijisanji.jp/1074",
    wiki: "https://wikiwiki.jp/nijisanji/%E3%83%AA%E3%82%BC%E3%83%BB%E3%83%98%E3%83%AB%E3%82%A8%E3%82%B9%E3%82%BF",
    profileImage: "/profiles/lize-helesta.jpg",
  },
  {
    id: "minamo-madoka",
    name: "水面まどか",
    reading: "みなもまどか",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@MinamoMadoka",
    xUrl: "https://x.com/Madoka_Minamo",
    wiki: "https://wikiwiki.jp/nijisanji/%E6%B0%B4%E9%9D%A2%E3%81%BE%E3%81%A9%E3%81%8B",
    profileImage: "/profiles/minamo-madoka.jpg",
  },
  {
    id: "purin-lala-mode",
    name: "ぷりん・らら・もーど",
    reading: "ぷりん・らら・もーど",
    group: "にじさんじ",
    youtubeUrl: "https://www.youtube.com/@PurinLalaMode",
    xUrl: "https://x.com/Purin_lala_mode",
    wiki: "https://wikiwiki.jp/nijisanji/%E3%81%B7%E3%82%8A%E3%82%93%E3%83%BB%E3%82%89%E3%82%89%E3%83%BB%E3%82%82%E3%83%BC%E3%81%A9",
    profileImage: "/profiles/purin-lala-mode.jpg",
  },
];
