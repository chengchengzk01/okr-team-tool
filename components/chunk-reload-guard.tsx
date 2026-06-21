"use client";

import { useEffect } from "react";
import {
  clearChunkRecoveryAttempt,
  isRecoverableChunkError,
  markChunkRecoveryAttempt,
  shouldAttemptChunkRecovery
} from "@/lib/chunk-reload";

export function ChunkReloadGuard() {
  useEffect(() => {
    clearChunkRecoveryAttempt(window.sessionStorage, window.location.pathname);

    const recover = (error: unknown) => {
      const pathname = window.location.pathname;
      if (!isRecoverableChunkError(error)) return;
      if (!shouldAttemptChunkRecovery(window.sessionStorage, pathname)) return;
      markChunkRecoveryAttempt(window.sessionStorage, pathname);
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => recover(event.error ?? event.message);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => recover(event.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
