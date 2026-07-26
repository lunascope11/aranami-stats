"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Google 로그인에 실패했습니다: ${error.message}`);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">로그인</h1>

      <p className="mt-3 text-sm text-zinc-400">
        로그인하면 관심 방송과 방송 일정을 여러 기기에서 동기화할 수
        있습니다.
      </p>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="mt-8 w-full rounded-lg bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "로그인 중..." : "Google로 로그인"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-zinc-400">
          {message}
        </p>
      )}
    </main>
  );
}