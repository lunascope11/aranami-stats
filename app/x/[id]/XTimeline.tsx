"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
  }
}

type XTimelineProps = {
  html: string;
};

export default function XTimeline({
  html,
}: XTimelineProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const loadTimeline = () => {
    if (
      window.twttr?.widgets &&
      containerRef.current
    ) {
      window.twttr.widgets.load(
        containerRef.current,
      );
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [html]);

  return (
    <>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl"
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />

      <Script
        src="https://platform.x.com/widgets.js"
        strategy="afterInteractive"
        onLoad={loadTimeline}
      />
    </>
  );
}