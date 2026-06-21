import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { assertOkrCreationOpenForRole } from "@/lib/domain/rules";
import { normalizeKeyResultCreateBody } from "@/lib/api/request-normalizers";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = normalizeKeyResultCreateBody(await request.json());
    const objective = repository.getObjective(id);
    if (!objective) throw new Error("Objective 不存在");
    const quarter = repository.listQuarters().find((item) => item.id === objective.quarterId);
    if (!quarter) throw new Error("季度不存在");
    assertOkrCreationOpenForRole(quarter.status, user.role);
    const permissionError = validateKeyResultCreatePermission(user, objective);
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 });
    assertKeyResultCreateBody(body);
    const keyResult = repository.createKeyResult({
      objectiveId: id,
      description: body.description,
      startValue: Number(body.startValue),
      targetValue: Number(body.targetValue),
      currentValue: Number(body.currentValue ?? body.startValue),
      unit: body.unit,
      ownerId: body.ownerId ?? user.id,
      dueDate: body.dueDate
    });
    return NextResponse.json({ keyResult }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求失败" }, { status: 400 });
  }
}

function assertKeyResultCreateBody(body: ReturnType<typeof normalizeKeyResultCreateBody>): asserts body is ReturnType<typeof normalizeKeyResultCreateBody> & {
  description: string;
  startValue: number | string;
  targetValue: number | string;
  dueDate: string;
} {
  if (!body.description?.trim()) throw new Error("KR 描述不能为空");
  if (body.startValue === undefined) throw new Error("KR 起始值不能为空");
  if (body.targetValue === undefined) throw new Error("KR 目标值不能为空");
  if (!body.dueDate) throw new Error("KR 截止日期不能为空");
}

function validateKeyResultCreatePermission(
  user: { id: string; role: string; departmentId?: string },
  objective: { ownerId: string; level: string; departmentId?: string }
) {
  if (user.role === "super_admin") return null;
  if (user.role === "dept_manager") {
    if (objective.level === "company") return "部门管理者不能为公司级 Objective 创建 KR";
    if (objective.departmentId !== user.departmentId) return "只能为本部门 Objective 创建 KR";
    return null;
  }
  if (objective.ownerId !== user.id) return "成员只能为自己的 Objective 创建 KR";
  return null;
}
