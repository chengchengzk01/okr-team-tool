import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { getVisibleOkrTreeFilter, repository } from "@/lib/data/repository";
import { assertOkrCreationOpenForRole } from "@/lib/domain/rules";
import { normalizeObjectiveCreateBody } from "@/lib/api/request-normalizers";
import type { ObjectiveLevel } from "@/lib/domain/types";

export async function GET(request: Request, context: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { quarterId } = await context.params;
  const url = new URL(request.url);
  const filter = getVisibleOkrTreeFilter(user, {
    query: url.searchParams.get("q") ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined
  });
  return NextResponse.json({ okrTree: (await prismaQueries.buildOkrTree(quarterId, filter)) ?? repository.buildOkrTree(quarterId, filter) });
}

export async function POST(request: Request, context: { params: Promise<{ quarterId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { quarterId } = await context.params;
    const body = normalizeObjectiveCreateBody(await request.json());
    const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
    const quarter = snapshot.listQuarters().find((item) => item.id === quarterId);
    if (!quarter) return NextResponse.json({ error: "季度不存在" }, { status: 404 });
    assertOkrCreationOpenForRole(quarter.status, user.role);
    assertObjectiveCreateBody(body);
    const permissionError = validateObjectiveCreatePermission(user, body);
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 });
    const objective = snapshot.createObjective(
      {
        quarterId,
        level: body.level,
        departmentId: body.departmentId,
        ownerId: body.ownerId ?? user.id,
        title: body.title
      },
      body.parentKeyResultIds
    );
    return NextResponse.json({ objective }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}

function assertObjectiveCreateBody(body: ReturnType<typeof normalizeObjectiveCreateBody>): asserts body is ReturnType<typeof normalizeObjectiveCreateBody> & {
  level: ObjectiveLevel;
  title: string;
} {
  if (!["company", "department", "individual"].includes(body.level ?? "")) throw new Error("Objective 层级无效");
  if (!body.title?.trim()) throw new Error("Objective 文本不能为空");
}

function validateObjectiveCreatePermission(
  user: { id: string; role: string; departmentId?: string },
  body: { level?: string; departmentId?: string; ownerId?: string }
) {
  if (user.role === "super_admin") return null;

  if (user.role === "dept_manager") {
    if (body.level === "company") return "部门管理者不能创建公司级 Objective";
    if (body.departmentId && body.departmentId !== user.departmentId) return "只能创建本部门 Objective";
    return null;
  }

  if (body.level !== "individual") return "成员只能创建个人级 Objective";
  if (body.ownerId && body.ownerId !== user.id) return "成员只能为自己创建 Objective";
  if (body.departmentId && body.departmentId !== user.departmentId) return "成员只能创建本部门 Objective";
  return null;
}
