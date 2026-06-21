import { ObjectiveManagementPanel } from "@/components/objective-management-panel";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { redirect } from "next/navigation";

export default async function ObjectiveDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) redirect("/login");

  const { id } = await params;
  const snapshot = (await prismaQueries.getRepositorySnapshot()) ?? repository;
  const objective = snapshot.getObjective(id);
  if (!objective) redirect("/okr");
  if (!canView(fullUser, objective.departmentId, objective.ownerId)) redirect("/okr");

  const owner = snapshot.getUser(objective.ownerId);
  const quarter = snapshot.getQuarter(objective.quarterId);
  const department = objective.departmentId ? snapshot.listDepartments().find((item) => item.id === objective.departmentId) : undefined;
  const keyResults = snapshot.listKeyResultsByObjective(objective.id);
  const canEdit = canManage(fullUser, objective.ownerId, objective.departmentId) && (quarter.status === "planning" || fullUser.role === "super_admin");
  const canDelete = canEdit && quarter.status === "planning";
  const readOnlyMessage =
    quarter.status === "archived"
      ? "季度已归档，Objective 只读。"
      : quarter.status !== "planning" && fullUser.role !== "super_admin"
        ? "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR。"
        : undefined;

  return (
    <>
      <PageHeader title="Objective 详情" eyebrow={quarter.name}>
        <a href="/okr" className="rounded-md border border-line bg-card px-3 py-2 text-sm font-medium text-steel hover:bg-hover">返回 OKR 树</a>
      </PageHeader>

      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted">Objective</div>
            <h1 className="mt-2 text-xl font-semibold text-ink">{objective.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-steel">
              <span>负责人：{owner?.name ?? "未指定"}</span>
              {department ? <span>部门：{department.name}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="gray">{levelLabel(objective.level)}</StatusPill>
            <StatusPill tone={quarter.status === "archived" ? "gray" : "blue"}>{quarter.status}</StatusPill>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-line bg-card shadow-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold text-ink">下属 KR</h2>
            <p className="mt-1 text-sm text-steel">查看该 Objective 下的 Key Results，并进入详细管理。</p>
          </div>
          <div className="divide-y divide-line">
            {keyResults.length ? keyResults.map((keyResult) => (
              <div key={keyResult.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <a href={`/key-results/${keyResult.id}`} className="font-medium text-ink underline-offset-2 hover:text-primary hover:underline">
                    {keyResult.description}
                  </a>
                  <StatusPill tone={keyResult.confidenceColor as "green" | "yellow" | "red" | "gray"}>
                    {keyResult.confidenceScore ? `信心值 ${keyResult.confidenceScore.score}` : "本周未更新"}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-steel">
                  当前 {keyResult.currentValue}{keyResult.unit} / 目标 {keyResult.targetValue}{keyResult.unit}
                </div>
              </div>
            )) : (
              <div className="p-4 text-sm text-muted">该 Objective 暂无 KR。</div>
            )}
          </div>
        </section>

        <ObjectiveManagementPanel
          objectiveId={objective.id}
          initialTitle={objective.title}
          canEdit={canEdit}
          canDelete={canDelete}
          isReadOnly={quarter.status === "archived"}
          readOnlyMessage={readOnlyMessage}
        />
      </div>
    </>
  );
}

function levelLabel(level: string) {
  return level === "company" ? "公司级" : level === "department" ? "部门级" : "个人级";
}

function canView(user: { id: string; role: string; departmentId?: string }, departmentId: string | undefined, ownerId: string) {
  return user.role === "super_admin" || ownerId === user.id || departmentId === user.departmentId;
}

function canManage(user: { id: string; role: string; departmentId?: string }, ownerId: string, departmentId: string | undefined) {
  return user.role === "super_admin" || ownerId === user.id || (user.role === "dept_manager" && departmentId === user.departmentId);
}
