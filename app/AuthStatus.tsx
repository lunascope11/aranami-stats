"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const [email, setEmail] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    let isMounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setEmail(user?.email ?? null);
      setIsLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setEmail(
          session?.user.email ?? null,
        );

        setIsLoading(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsSigningOut(true);

    const supabase = createClient();

    const { error } =
      await supabase.auth.signOut({
        scope: "local",
      });

    if (error) {
      console.error(
        "로그아웃에 실패했습니다.",
        error,
      );

      setIsSigningOut(false);
      return;
    }

    setEmail(null);
    setIsSigningOut(false);

    router.push("/");
    router.refresh();
  }

  if (isLoading) {
    return null;
  }

  return (
    <div className="fixed right-5 top-5 z-50 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 shadow-lg backdrop-blur">
      {email ? (
        <>
          <div className="text-right">
            <p className="text-xs text-zinc-500">
              로그인 중
            </p>

            <p className="max-w-48 truncate text-sm text-zinc-200">
              {email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut
              ? "로그아웃 중..."
              : "로그아웃"}
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600"
        >
          Google 로그인
        </Link>
      )}
    </div>
  );
}