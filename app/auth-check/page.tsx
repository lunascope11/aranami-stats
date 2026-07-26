import { createClient } from "@/lib/supabase/server";

export default async function AuthCheckPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">로그인 상태 확인</h1>

      {error || !claims ? (
        <p className="mt-6 text-red-400">
          로그인되어 있지 않습니다.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-green-400">Google 로그인 확인 완료</p>

          <p>
            이메일:{" "}
            <span className="text-zinc-400">
              {String(claims.email ?? "")}
            </span>
          </p>

          <p>
            User ID:{" "}
            <span className="break-all text-zinc-400">
              {String(claims.sub ?? "")}
            </span>
          </p>
        </div>
      )}
    </main>
  );
}