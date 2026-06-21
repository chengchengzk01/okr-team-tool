import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRuntimeBaselineReport } from "@/lib/runtime/runtime-baseline";

export async function GET() {
  const report = getRuntimeBaselineReport();
  const database = await getDatabaseHealth();

  return NextResponse.json(
    {
      ok: report.ready && database.ok,
      checkedAt: new Date().toISOString(),
      mode: report.mode,
      appUrl: report.appUrl,
      mockLoginEnabled: report.mockLoginEnabled,
      env: {
        ready: report.ready,
        missingItems: report.missingItems,
        warnings: report.warnings
      },
      database
    },
    { status: report.ready && database.ok ? 200 : 503 }
  );
}

async function getDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const [users, quarters, objectives, keyResults] = await Promise.all([
      prisma.user.count(),
      prisma.quarter.count(),
      prisma.objective.count(),
      prisma.keyResult.count()
    ]);

    return {
      ok: true,
      counts: { users, quarters, objectives, keyResults }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Database check failed"
    };
  }
}
