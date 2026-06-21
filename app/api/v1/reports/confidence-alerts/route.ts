import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const url = new URL(request.url);
  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const quarterId = url.searchParams.get("quarter_id") ?? currentQuarter.id;
  const departmentId = url.searchParams.get("department_id") ?? undefined;

  return NextResponse.json({
    confidenceAlerts:
      (await prismaQueries.listConfidenceAlerts(fullUser, quarterId, { departmentId })) ??
      repository.listConfidenceAlerts(fullUser, quarterId, { departmentId })
  });
}
