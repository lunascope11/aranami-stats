import Link from "next/link";
import { notFound } from "next/navigation";
import { vtubers } from "../../../data/vtubers";
import XTimeline from "./XTimeline";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

type XEmbedResponse = {
    html: string;
};

export default async function XDetailPage({
    params,
}: PageProps) {
    const { id } = await params;

    const vtuber = vtubers.find(
        (item) => item.id === id,
    );

    if (!vtuber || !vtuber.xUrl) {
        notFound();
    }

    const oEmbedUrl = new URL(
        "https://publish.x.com/oembed",
    );

    oEmbedUrl.searchParams.set(
        "url",
        vtuber.xUrl,
    );

    oEmbedUrl.searchParams.set(
        "limit",
        "3",
    );

    oEmbedUrl.searchParams.set(
        "theme",
        "dark",
    );

    oEmbedUrl.searchParams.set(
        "dnt",
        "true",
    );

    oEmbedUrl.searchParams.set(
        "omit_script",
        "1",
    );

    let embedHtml = "";

    try {
        const response = await fetch(
            oEmbedUrl.toString(),
            {
                next: {
                    revalidate: 300,
                },
            },
        );

        if (response.ok) {
            const data =
                (await response.json()) as XEmbedResponse;

            embedHtml = data.html;
        }
    } catch (error) {
        console.error(
            "X timeline embed error:",
            error,
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
            <div className="mx-auto max-w-2xl">
                <Link
                    href="/x"
                    className="mb-8 inline-block text-sm text-zinc-400 hover:text-white"
                >
                    ← X 기록으로
                </Link>

                <header className="mb-8">
                    <p className="text-sm text-zinc-500">
                        {vtuber.group}
                    </p>

                    <h1 className="mt-2 text-3xl font-bold">
                        {vtuber.name}
                    </h1>

                    <p className="mt-1 text-sm text-zinc-400">
                        {vtuber.reading}
                    </p>

                    <a
                        href={vtuber.xUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-sm font-semibold text-violet-400 hover:text-violet-300"
                    >
                        X에서 프로필 열기 ↗
                    </a>
                </header>

                <section>
                    <h2 className="mb-5 text-xl font-bold">
                        최근 X 게시물
                    </h2>

                    {embedHtml ? (
                        <XTimeline html={embedHtml} />
                    ) : (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                            <p className="text-sm text-zinc-400">
                                X 게시물을 불러오지 못했습니다.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}