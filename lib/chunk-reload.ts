const RECOVERY_PREFIX = "okr-chunk-recovery";
const RECOVERY_TTL_MS = 60_000;
const CHUNK_ERROR_PATTERNS = [
  "chunkloaderror",
  "loading chunk",
  "failed to fetch dynamically imported module",
  "importing a module script failed"
];

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getChunkErrorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    if ("reason" in value) return getChunkErrorMessage(value.reason);
    if ("message" in value && typeof value.message === "string") return value.message;
  }
  return "";
}

export function isRecoverableChunkError(value: unknown) {
  const message = getChunkErrorMessage(value).toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function getChunkRecoveryKey(pathname: string) {
  return `${RECOVERY_PREFIX}:${pathname}`;
}

export function shouldAttemptChunkRecovery(storage: StorageLike, pathname: string, now = Date.now()) {
  const raw = storage.getItem(getChunkRecoveryKey(pathname));
  if (!raw) return true;

  const lastAttempt = Number(raw);
  if (!Number.isFinite(lastAttempt)) return true;
  return now - lastAttempt > RECOVERY_TTL_MS;
}

export function markChunkRecoveryAttempt(storage: StorageLike, pathname: string, now = Date.now()) {
  storage.setItem(getChunkRecoveryKey(pathname), String(now));
}

export function clearChunkRecoveryAttempt(storage: StorageLike, pathname: string) {
  storage.removeItem(getChunkRecoveryKey(pathname));
}
