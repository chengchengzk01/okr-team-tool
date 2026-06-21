import { describe, expect, test } from "vitest";
import {
  clearChunkRecoveryAttempt,
  getChunkRecoveryKey,
  isRecoverableChunkError,
  markChunkRecoveryAttempt,
  shouldAttemptChunkRecovery
} from "@/lib/chunk-reload";

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    }
  };
}

describe("chunk reload guard", () => {
  test("recognizes chunk loading failures from common browser messages", () => {
    expect(isRecoverableChunkError(new Error("ChunkLoadError: Loading chunk 3448 failed."))).toBe(true);
    expect(isRecoverableChunkError("Failed to fetch dynamically imported module")).toBe(true);
    expect(isRecoverableChunkError(new Error("Regular form validation error"))).toBe(false);
  });

  test("allows one recovery attempt within the ttl window", () => {
    const storage = createStorage();
    const pathname = "/review";

    expect(shouldAttemptChunkRecovery(storage, pathname, 1_000)).toBe(true);

    markChunkRecoveryAttempt(storage, pathname, 1_000);
    expect(storage.getItem(getChunkRecoveryKey(pathname))).toBe("1000");
    expect(shouldAttemptChunkRecovery(storage, pathname, 1_500)).toBe(false);
    expect(shouldAttemptChunkRecovery(storage, pathname, 62_000)).toBe(true);
  });

  test("clears the current page marker after a successful load", () => {
    const storage = createStorage();
    const pathname = "/review";

    markChunkRecoveryAttempt(storage, pathname, 1_000);
    clearChunkRecoveryAttempt(storage, pathname);

    expect(storage.getItem(getChunkRecoveryKey(pathname))).toBeNull();
    expect(shouldAttemptChunkRecovery(storage, pathname, 1_500)).toBe(true);
  });
});
