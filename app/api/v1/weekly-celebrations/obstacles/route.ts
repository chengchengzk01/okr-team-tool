import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role !== "dept_manager" && user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限查看障碍汇总" }, { status: 403 });
  }
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const url = new URL(request.url);
  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const dashboard = (await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id);
  const quarterId = url.searchParams.get("quarter_id") ?? currentQuarter.id;
  const weekNumber = Number(url.searchParams.get("week_number") ?? dashboard.weekNumber);

  return NextResponse.json({
    obstacles: (await prismaQueries.listWeeklyObstacles(fullUser, quarterId, weekNumber)) ?? repository.listWeeklyObstacles(fullUser, quarterId, weekNumber)
  });
}
