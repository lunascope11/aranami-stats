import { createClient } from "@/lib/supabase/server";

export default async function SyncCheckPage() {
  const supabase = await createClient();

  const { data: claimsData, error: authError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (authError || !userId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <p>로그인이 필요합니다.</p>
      </main>
    );
  }

  const { data: existingData, error: readError } = await supabase
    .from("sync_data")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <p className="text-red-400">
          DB 읽기 실패: {readError.message}
        </p>
      </main>
    );
  }

  if (!existingData) {
    const { data: newData, error: insertError } = await supabase
      .from("sync_data")
      .insert({
        user_id: userId,
        manual_videos: [],
        live_stream_plans: [],
      })
      .select()
      .single();

    if (insertError) {
      return (
        <main className="mx-auto max-w-xl px-6 py-16">
          <p className="text-red-400">
            DB 행 생성 실패: {insertError.message}
          </p>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold">동기화 DB 확인</h1>

        <p className="mt-6 text-green-400">
          내 sync_data 행을 새로 생성했습니다.
        </p>

        <pre className="mt-4 overflow-auto rounded-lg bg-zinc-900 p-4 text-sm">
          {JSON.stringify(newData, null, 2)}
        </pre>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">동기화 DB 확인</h1>

      <p className="mt-6 text-green-400">
        기존 sync_data 행을 정상적으로 읽었습니다.
      </p>

      <pre className="mt-4 overflow-auto rounded-lg bg-zinc-900 p-4 text-sm">
        {JSON.stringify(existingData, null, 2)}
      </pre>
    </main>
  );
}