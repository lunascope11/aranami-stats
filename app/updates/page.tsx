import { changelog } from "../../data/changelog";

export default function UpdatesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10">
        <p className="text-sm text-zinc-500">VTuber Hub</p>

        <h1 className="mt-2 text-3xl font-bold">
          업데이트 기록
        </h1>

        <p className="mt-3 text-sm text-zinc-400">
          VTuber Hub의 버전별 변경 사항을 기록합니다.
        </p>
      </div>

      <div className="space-y-8">
        {changelog.map((entry) => (
          <section
            key={entry.version}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold">
                {entry.version}
              </h2>

              <span className="text-sm text-zinc-500">
                {entry.date}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-medium">
              {entry.title}
            </h3>

            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {entry.changes.map((change) => (
                <li
                  key={change}
                  className="flex gap-2"
                >
                  <span className="text-zinc-600">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}