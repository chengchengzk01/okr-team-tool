import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("chunk reload UI contract", () => {
  test("root layout installs the global chunk reload guard and error fallback", () => {
    const layoutSource = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const guardSource = readFileSync(join(process.cwd(), "components/chunk-reload-guard.tsx"), "utf8");
    const errorSource = readFileSync(join(process.cwd(), "app/global-error.tsx"), "utf8");

    expect(layoutSource).toContain("ChunkReloadGuard");
    expect(guardSource).toContain("window.addEventListener(\"error\"");
    expect(guardSource).toContain("window.addEventListener(\"unhandledrejection\"");
    expect(errorSource).toContain("系统已检测到资源已更新");
  });
});
