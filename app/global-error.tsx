"use client";

import { useEffect } from "react";
import { isRecoverableChunkError } from "@/lib/chunk-reload";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isRecoverableChunkError(error)) return;
    const timer = window.setTimeout(() => {
      reset();
      window.location.reload();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [error, reset]);

  return (
    <html lang="zh-CN">
      <body className="bg-base text-ink">
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-md rounded-lg border border-line bg-card p-6 shadow-panel">
            <p className="text-sm font-medium text-primary">页面正在恢复</p>
            <h1 className="mt-2 text-xl font-semibold">系统已检测到资源已更新</h1>
            <p className="mt-3 text-sm leading-6 text-steel">
              当前页面正在重新加载最新内容。若仍未恢复，可点击下方按钮重新进入。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                刷新页面
              </button>
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-md border border-line bg-card px-4 py-2 text-sm font-medium text-ink"
              >
                重试加载
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
