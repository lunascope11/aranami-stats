"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { vtubers } from "../../data/vtubers";
import { createClient } from "@/lib/supabase/client";
import { vtuberInfos } from "../../data/vtuber-infos";

type LiveStreamStatus =
  | "planned"
  | "confirmed"
  | "cancelled";

type LiveStreamPlan = {
  id: string;
  vtuberIds: string[];
  title: string;
  scheduledAt: string;
  status: LiveStreamStatus;
  youtubeUrl: string;
  memo: string;
};

const STORAGE_KEY = "vtuber-live-stream-plans";

const statusLabels: Record<LiveStreamStatus, string> = {
  planned: "예정",
  confirmed: "확정",
  cancelled: "취소",
};

const statusStyles: Record<LiveStreamStatus, string> = {
  planned: "bg-blue-700 text-white",
  confirmed: "bg-emerald-700 text-white",
  cancelled: "bg-zinc-700 text-zinc-300",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateInput(value: string) {
  const numbers = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (numbers.length <= 4) {
    return numbers;
  }

  if (numbers.length <= 6) {
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
  }

  return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6)}`;
}

const WEEKDAYS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
];

function getMonthStart(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  );
}

function addMonths(date: Date, amount: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1,
  );
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1
    }월`;
}

function getDateKey(
  year: number,
  month: number,
  day: number,
) {
  return `${year}-${String(month + 1).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstWeekday = new Date(
    year,
    monthIndex,
    1,
  ).getDay();

  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0,
  ).getDate();

  const totalCells =
    Math.ceil(
      (firstWeekday + daysInMonth) / 7,
    ) * 7;

  return Array.from(
    { length: totalCells },
    (_, index) => {
      const day =
        index - firstWeekday + 1;

      if (
        day < 1 ||
        day > daysInMonth
      ) {
        return null;
      }

      return {
        day,
        dateKey: getDateKey(
          year,
          monthIndex,
          day,
        ),
      };
    },
  );
}

function getHexLuminance(hex: string) {
  const normalized = hex.replace("#", "");

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

function getReadableTextColor(
  color?: string,
  subcolor?: string,
) {
  const colors = [color, subcolor].filter(
    (value): value is string => Boolean(value),
  );

  if (colors.length === 0) {
    return "#ffffff";
  }

  const averageLuminance =
    colors.reduce(
      (sum, currentColor) =>
        sum + getHexLuminance(currentColor),
      0,
    ) / colors.length;

  return averageLuminance > 0.65
    ? "#18181b"
    : "#ffffff";
}

function getCalendarEventStyle(vtuberId?: string) {
  const info = vtuberInfos.find(
    (candidate) => candidate.id === vtuberId,
  );

  const color = info?.color ?? "#3f3f46";
  const subcolor = info?.subcolor;

  return {
    background: subcolor
      ? `linear-gradient(135deg, ${color}, ${subcolor})`
      : color,
    color: getReadableTextColor(color, subcolor),
  };
}

export default function LiveStreamsPage() {
  const [plans, setPlans] = useState<LiveStreamPlan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [localPlans, setLocalPlans] =
    useState<LiveStreamPlan[]>([]);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [cloudPlanCount, setCloudPlanCount] =
    useState<number | null>(null);

  const [syncMessage, setSyncMessage] =
    useState("");

  const [vtuberIds, setVtuberIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [scheduledYear, setScheduledYear] = useState("");
  const [scheduledMonth, setScheduledMonth] = useState("");
  const [scheduledDay, setScheduledDay] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] =
    useState<LiveStreamStatus>("planned");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [memo, setMemo] = useState("");

  const [calendarMonth, setCalendarMonth] =
    useState(() => getMonthStart(new Date()));

  const [selectedPlan, setSelectedPlan] =
    useState<LiveStreamPlan | null>(null);

  useEffect(() => {
    async function loadPlans() {
      // 현재 브라우저의 일정은 별도로 읽어둠
      const savedPlans =
        localStorage.getItem(STORAGE_KEY);

      let parsedLocalPlans: LiveStreamPlan[] = [];

      if (savedPlans) {
        try {
          parsedLocalPlans =
            JSON.parse(savedPlans) as LiveStreamPlan[];
        } catch (error) {
          console.error(
            "브라우저 일정 데이터를 읽지 못했습니다.",
            error,
          );
        }
      }

      setLocalPlans(parsedLocalPlans);

      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "로그인 상태를 확인하지 못했습니다.",
          sessionError,
        );
      }

      const user = session?.user ?? null;

      // 비로그인 → localStorage
      if (!user) {
        setIsLoggedIn(false);
        setCloudPlanCount(null);
        setPlans(parsedLocalPlans);
        setIsLoaded(true);

        return;
      }

      // 로그인 → Supabase
      setIsLoggedIn(true);

      const { data, error } = await supabase
        .from("sync_data")
        .select("live_stream_plans")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "계정의 방송 일정 데이터를 읽지 못했습니다.",
          error,
        );

        setIsLoaded(true);
        return;
      }

      const cloudPlans = Array.isArray(
        data?.live_stream_plans,
      )
        ? (data.live_stream_plans as LiveStreamPlan[])
        : [];

      setPlans(cloudPlans);
      setCloudPlanCount(cloudPlans.length);
      setIsLoaded(true);
    }

    void loadPlans();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    async function savePlans() {
      // 비로그인 → localStorage에 저장
      if (!isLoggedIn) {
        setLocalPlans(plans);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(plans),
        );

        return;
      }

      // 로그인 → Supabase에 저장
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.user
      ) {
        console.error(
          "로그인 정보를 확인하지 못했습니다.",
          sessionError,
        );

        return;
      }

      const { error } = await supabase
        .from("sync_data")
        .update({
          live_stream_plans: plans,
          updated_at: new Date().toISOString(),
        })
        .eq(
          "user_id",
          session.user.id,
        );

      if (error) {
        console.error(
          "계정의 방송 일정을 저장하지 못했습니다.",
          error,
        );

        return;
      }

      setCloudPlanCount(plans.length);
    }

    void savePlans();
  }, [plans, isLoaded, isLoggedIn]);

  useEffect(() => {
    async function checkLogin() {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "로그인 상태를 확인하지 못했습니다.",
          sessionError,
        );
      }

      const user = session?.user ?? null;

      setIsLoggedIn(Boolean(user));

      if (!user) {
        setCloudPlanCount(null);
        return;
      }

      const { data, error } = await supabase
        .from("sync_data")
        .select("live_stream_plans")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "계정의 방송 일정 데이터를 읽지 못했습니다.",
          error,
        );
        return;
      }

      const cloudPlans = Array.isArray(
        data?.live_stream_plans,
      )
        ? data.live_stream_plans
        : [];

      setCloudPlanCount(cloudPlans.length);
    }

    void checkLogin();
  }, []);

  function toggleVtuber(selectedId: string) {
    setVtuberIds((currentIds) => {
      if (currentIds.includes(selectedId)) {
        return currentIds.filter(
          (id) => id !== selectedId,
        );
      }

      return [...currentIds, selectedId];
    });
  }

  function addPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      vtuberIds.length === 0 ||
      !title.trim() ||
      !scheduledYear ||
      !scheduledMonth ||
      !scheduledDay ||
      !scheduledTime
    ) {
      return;
    }

    const normalizedMonth =
      scheduledMonth.padStart(2, "0");

    const normalizedDay =
      scheduledDay.padStart(2, "0");

    const scheduledDate =
      `${scheduledYear}-${normalizedMonth}-${normalizedDay}`;

    const newPlan: LiveStreamPlan = {
      id: crypto.randomUUID(),
      vtuberIds: [...vtuberIds],
      title: title.trim(),
      scheduledAt: `${scheduledDate}T${scheduledTime}`,
      status,
      youtubeUrl: youtubeUrl.trim(),
      memo: memo.trim(),
    };

    setPlans((currentPlans) => [
      ...currentPlans,
      newPlan,
    ]);

    setVtuberIds([]);
    setTitle("");
    setScheduledYear("");
    setScheduledMonth("");
    setScheduledDay("");
    setScheduledTime("");
    setStatus("planned");
    setYoutubeUrl("");
    setMemo("");
  }

  async function importLocalPlansToCloud() {
    if (
      !isLoggedIn ||
      localPlans.length === 0
    ) {
      return;
    }

    setSyncMessage("");

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.user
      ) {
        throw new Error(
          "로그인 정보를 확인하지 못했습니다.",
        );
      }

      const { error } = await supabase
        .from("sync_data")
        .update({
          live_stream_plans: localPlans,
          updated_at: new Date().toISOString(),
        })
        .eq(
          "user_id",
          session.user.id,
        );

      if (error) {
        throw error;
      }

      setPlans([...localPlans]);
      setCloudPlanCount(localPlans.length);

      setSyncMessage(
        `현재 브라우저의 ${localPlans.length}개 일정을 계정에 가져왔습니다.`,
      );
    } catch (error) {
      setSyncMessage(
        error instanceof Error
          ? error.message
          : "계정으로 가져오지 못했습니다.",
      );
    }
  }

  function deletePlan(id: string) {
    const shouldDelete = window.confirm(
      "이 방송 일정을 삭제할까요?",
    );

    if (!shouldDelete) {
      return;
    }

    setPlans((currentPlans) =>
      currentPlans.filter((plan) => plan.id !== id),
    );
  }

  const sortedPlans = [...plans].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() -
      new Date(b.scheduledAt).getTime(),
  );

  const currentMonth =
    getMonthStart(new Date());

  const minCalendarMonth =
    addMonths(currentMonth, -4);

  const maxCalendarMonth =
    addMonths(currentMonth, 8);

  const previousMonth =
    addMonths(calendarMonth, -1);

  const nextMonth =
    addMonths(calendarMonth, 1);

  const canGoPrevious =
    previousMonth >= minCalendarMonth;

  const canGoNext =
    nextMonth <= maxCalendarMonth;

  const calendarDays =
    getCalendarDays(calendarMonth);

  const plansByDate =
    sortedPlans.reduce<
      Record<string, LiveStreamPlan[]>
    >((result, plan) => {
      const dateKey =
        plan.scheduledAt.slice(0, 10);

      if (!result[dateKey]) {
        result[dateKey] = [];
      }

      result[dateKey].push(plan);

      return result;
    }, {});

  const selectedPlanVtubers = selectedPlan
    ? selectedPlan.vtuberIds
      .map((id) =>
        vtubers.find(
          (vtuber) => vtuber.id === id,
        ),
      )
      .filter(
        (
          vtuber,
        ): vtuber is (typeof vtubers)[number] =>
          vtuber !== undefined,
      )
    : [];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            ← 홈으로
          </Link>

          <h1 className="mt-4 text-4xl font-bold">
            라이브 방송 일정
          </h1>

          <p className="mt-3 text-zinc-400">
            페이지에서 직접 방송 계획을 추가하고
            관리합니다.
          </p>

          <p className="mt-2 text-xs text-zinc-600">
            저장 위치:{" "}
            {isLoggedIn
              ? "로그인 계정"
              : "이 브라우저"}
          </p>

          {isLoggedIn && cloudPlanCount !== null && (
            <p className="mt-1 text-xs text-zinc-600">
              계정 일정: {cloudPlanCount}개 /
              현재 브라우저 일정: {localPlans.length}개
            </p>
          )}

          {isLoggedIn &&
            cloudPlanCount === 0 &&
            localPlans.length > 0 && (
              <button
                type="button"
                onClick={importLocalPlansToCloud}
                className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600"
              >
                이 브라우저 일정을 계정에 가져오기
              </button>
            )}

          {syncMessage && (
            <p className="mt-2 text-sm text-zinc-400">
              {syncMessage}
            </p>
          )}
        </header>

        <section className="mb-12 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                일정 달력
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {formatMonth(minCalendarMonth)}
                {" ~ "}
                {formatMonth(maxCalendarMonth)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(previousMonth)
                }
                disabled={!canGoPrevious}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← 이전
              </button>

              <p className="min-w-28 text-center text-lg font-bold">
                {formatMonth(calendarMonth)}
              </p>

              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(nextMonth)
                }
                disabled={!canGoNext}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                다음 →
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-7 border-b border-zinc-800">
                {WEEKDAYS.map((weekday, index) => (
                  <div
                    key={weekday}
                    className={`px-2 py-3 text-center text-sm font-bold ${index === 0
                      ? "text-red-400"
                      : index === 6
                        ? "text-blue-400"
                        : "text-zinc-400"
                      }`}
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((calendarDay, index) => {
                  if (!calendarDay) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[130px] border-b border-r border-zinc-800/70 bg-zinc-950/30"
                      />
                    );
                  }

                  const dayPlans =
                    plansByDate[
                    calendarDay.dateKey
                    ] ?? [];

                  const weekdayIndex =
                    index % 7;

                  return (
                    <div
                      key={calendarDay.dateKey}
                      className="min-h-[130px] border-b border-r border-zinc-800/70 p-2"
                    >
                      <p
                        className={`text-sm font-semibold ${weekdayIndex === 0
                          ? "text-red-400"
                          : weekdayIndex === 6
                            ? "text-blue-400"
                            : "text-zinc-300"
                          }`}
                      >
                        {calendarDay.day}
                      </p>

                      <div className="mt-2 grid gap-1">
                        {dayPlans
                          .slice(0, 3)
                          .map((plan) => {
                            const representativeId =
                              plan.vtuberIds[0];

                            const representativeVtuber =
                              vtubers.find(
                                (vtuber) =>
                                  vtuber.id === representativeId,
                              );

                            const participantCount =
                              plan.vtuberIds.length;

                            const extraCount =
                              Math.max(0, participantCount - 1);

                            const time =
                              plan.scheduledAt.slice(11, 16);

                            return (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => setSelectedPlan(plan)}
                                style={getCalendarEventStyle(
                                  representativeId,
                                )}
                                className={`w-full overflow-hidden rounded-md px-2 py-1.5 text-left text-xs transition hover:brightness-110 ${plan.status === "cancelled"
                                  ? "opacity-60 line-through"
                                  : ""
                                  }`}
                              >
                                <p className="font-bold">
                                  {time}
                                </p>

                                <div className="flex min-w-0 items-center gap-1.5">
                                  {representativeVtuber && (
                                    <Image
                                      src={representativeVtuber.profileImage}
                                      alt=""
                                      width={16}
                                      height={16}
                                      className="h-4 w-4 shrink-0 rounded-full object-cover"
                                    />
                                  )}

                                  <p className="truncate font-semibold">
                                    {representativeVtuber?.name ??
                                      "라이버 미지정"}

                                    {extraCount > 0 &&
                                      ` 외 ${extraCount}명`}
                                  </p>
                                </div>

                                <p className="truncate opacity-80">
                                  {plan.title}
                                </p>
                              </button>
                            );
                          })}

                        {dayPlans.length > 3 && (
                          <p className="px-1 pt-1 text-xs font-semibold text-zinc-500">
                            +{dayPlans.length - 3}개
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">
            새 일정 추가
          </h2>

          <form
            onSubmit={addPlan}
            className="mt-6 grid gap-5"
          >

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-zinc-300">
                참가 라이버
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                {[...vtubers]
                  .sort((a, b) =>
                    a.reading.localeCompare(
                      b.reading,
                      "ja",
                    ),
                  )
                  .map((vtuber) => (

                    <label
                      key={vtuber.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 hover:border-violet-600"
                    >
                      <input
                        type="checkbox"
                        checked={vtuberIds.includes(vtuber.id)}
                        onChange={() => toggleVtuber(vtuber.id)}
                        className="h-4 w-4"
                      />

                      <Image
                        src={vtuber.profileImage}
                        alt={`${vtuber.name} 프로필 사진`}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />

                      <span className="font-semibold">
                        {vtuber.name}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                방송 제목
              </span>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="예: 잡담 방송"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(180px,1fr)]">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-300">
                  방송 시간
                </span>

                <div className="flex min-w-0 items-center rounded-lg border border-zinc-700 bg-zinc-950 focus-within:border-violet-500">
                  <input
                    type="text"
                    value={scheduledYear}
                    onChange={(event) =>
                      setScheduledYear(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4),
                      )
                    }
                    placeholder="2026"
                    inputMode="numeric"
                    maxLength={4}
                    aria-label="방송 연도"
                    className="w-20 bg-transparent px-3 py-3 text-center outline-none"
                    required
                  />

                  <span className="text-sm text-zinc-500">
                    년
                  </span>

                  <span className="mx-2 h-5 w-px bg-zinc-800" />

                  <input
                    type="text"
                    value={scheduledMonth}
                    onChange={(event) =>
                      setScheduledMonth(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      )
                    }
                    onBlur={() => {
                      if (scheduledMonth) {
                        setScheduledMonth(
                          scheduledMonth.padStart(2, "0"),
                        );
                      }
                    }}
                    placeholder="MM"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="방송 월"
                    className="w-10 bg-transparent py-3 text-center outline-none"
                    required
                  />

                  <span className="text-sm text-zinc-500">
                    월
                  </span>

                  <input
                    type="text"
                    value={scheduledDay}
                    onChange={(event) =>
                      setScheduledDay(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      )
                    }
                    onBlur={() => {
                      if (scheduledDay) {
                        setScheduledDay(
                          scheduledDay.padStart(2, "0"),
                        );
                      }
                    }}
                    placeholder="DD"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="방송 일"
                    className="w-10 bg-transparent py-3 text-center outline-none"
                    required
                  />

                  <span className="text-sm text-zinc-500">
                    일
                  </span>

                  <span className="mx-2 h-5 w-px bg-zinc-800" />

                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(event) =>
                      setScheduledTime(event.target.value)
                    }
                    aria-label="방송 시각"
                    className="min-w-[110px] flex-1 bg-transparent px-3 py-3 outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-300">
                  상태
                </span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as LiveStreamStatus,
                    )
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
                >
                  <option value="planned">예정</option>
                  <option value="confirmed">확정</option>
                  <option value="cancelled">취소</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                방송 링크
              </span>

              <input
                type="url"
                value={youtubeUrl}
                onChange={(event) =>
                  setYoutubeUrl(event.target.value)
                }
                placeholder="https://www.youtube.com/..."
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                메모
              </span>

              <textarea
                value={memo}
                onChange={(event) =>
                  setMemo(event.target.value)
                }
                placeholder="콜라보 상대나 방송 내용 등을 입력"
                rows={3}
                className="resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
              />
            </label>

            <button
              type="submit"
              className="w-fit rounded-lg bg-violet-700 px-6 py-3 font-bold text-white hover:bg-violet-600"
            >
              일정 추가
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-bold">
              등록된 일정
            </h2>

            <p className="text-sm text-zinc-500">
              {plans.length}개
            </p>
          </div>

          {!isLoaded ? (
            <p className="text-zinc-500">
              일정을 불러오는 중입니다.
            </p>
          ) : sortedPlans.length > 0 ? (
            <div className="space-y-5">
              {sortedPlans.map((plan) => {
                const planVtubers = vtubers.filter(
                  (candidate) =>
                    plan.vtuberIds.includes(candidate.id),
                );

                if (planVtubers.length === 0) {
                  return null;
                }

                return (
                  <article
                    key={plan.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-wrap gap-5">
                        {planVtubers.map((vtuber) => (
                          <Link
                            key={vtuber.id}
                            href={`/vtubers/${vtuber.id}`}
                            className="flex items-center gap-3 rounded-lg hover:text-violet-300"
                          >
                            <Image
                              src={vtuber.profileImage}
                              alt={`${vtuber.name} 프로필 사진`}
                              width={56}
                              height={56}
                              className="h-14 w-14 rounded-full object-cover"
                            />

                            <div>
                              <p className="font-bold">
                                {vtuber.name}
                              </p>

                              <p className="mt-1 text-sm text-zinc-500">
                                {vtuber.group}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[plan.status]}`}
                      >
                        {statusLabels[plan.status]}
                      </span>
                    </div>

                    <time className="mt-6 block text-sm font-semibold text-violet-400">
                      {formatDate(plan.scheduledAt)}
                    </time>

                    <h3
                      className={`mt-2 text-xl font-bold ${plan.status === "cancelled"
                        ? "text-zinc-500 line-through"
                        : ""
                        }`}
                    >
                      {plan.title}
                    </h3>

                    {plan.memo && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                        {plan.memo}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3">
                      {plan.youtubeUrl && (
                        <a
                          href={plan.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
                        >
                          방송 페이지
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deletePlan(plan.id)
                        }
                        className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-600"
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
              아직 등록된 방송 일정이 없습니다.
            </div>
          )}
        </section>
      </div>

      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setSelectedPlan(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-400">
                  {formatDate(
                    selectedPlan.scheduledAt,
                  )}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {selectedPlan.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="rounded-lg px-3 py-1 text-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[selectedPlan.status]}`}
              >
                {statusLabels[selectedPlan.status]}
              </span>
            </div>

            <div className="mt-7">
              <h3 className="text-sm font-bold text-zinc-400">
                참가 라이버
              </h3>

              <div className="mt-3 grid gap-2">
                {selectedPlanVtubers.map(
                  (vtuber) => (
                    <Link
                      key={vtuber.id}
                      href={`/vtubers/${vtuber.id}`}
                      className="flex items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2 hover:bg-zinc-800"
                    >
                      <Image
                        src={vtuber.profileImage}
                        alt={`${vtuber.name} 프로필 사진`}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover"
                      />

                      <span className="font-semibold">
                        {vtuber.name}
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </div>

            {selectedPlan.memo && (
              <div className="mt-7">
                <h3 className="text-sm font-bold text-zinc-400">
                  메모
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                  {selectedPlan.memo}
                </p>
              </div>
            )}

            {selectedPlan.youtubeUrl && (
              <a
                href={selectedPlan.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-7 block rounded-lg bg-red-600 px-4 py-3 text-center font-bold text-white hover:bg-red-500"
              >
                방송 페이지 열기
              </a>
            )}
          </div>
        </div>
      )}

    </main>
  );
}