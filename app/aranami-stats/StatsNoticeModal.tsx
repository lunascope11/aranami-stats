"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY =
  "aranami-stats-notice-seen-v1";

export default function StatsNoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const alreadySeen =
      localStorage.getItem(STORAGE_KEY);

    if (!alreadySeen) {
      setOpen(true);
    }
  }, []);

  function closeModal() {
    localStorage.setItem(
      STORAGE_KEY,
      "true",
    );

    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-amber-300">
          통계 이용 시 주의사항
        </h2>

        <div className="mt-4 space-y-3 text-base leading-7 text-zinc-300">
          <p>
            이 통계는 YouTube 방송 데이터를 기준으로 계산됩니다.
          </p>

          <p>
            1. 실제 진행 시간은 참가자 중 적어도 한 명이
            あらなみマイクラ 방송을 하고 있었던 시간이며,
            실제 서버 가동 시간이나 플레이 시간을 의미하지 않습니다.
          </p>

          <p>
            2. 단독 방송 시간은 다른 참가자의 방송과 겹치지 않은 시간입니다.
            방송을 켜지 않고 서버에 접속해 있던 참가자는 반영되지 않습니다.
          </p>

          <p>
            3. 방송 제목과 YouTube에서 확인 가능한 데이터를 기준으로 집계하므로
            일부 방송이 누락될 수 있습니다.
          </p>

          <p>
            4. 동시 방송 페어 시간은 두 참가자의 방송이 동시에 켜져있는지 유무를 바탕으로 집계했습니다.
            따라서 동시 방송 페어 시간동안 두 참가자가 각자 행동을 하고 있더라도 이는 통계에 반영되지 않습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={closeModal}
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-500"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
}