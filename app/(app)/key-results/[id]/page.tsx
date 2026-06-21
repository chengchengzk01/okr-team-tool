import { KeyResultManagementPanel } from "@/components/key-result-management-panel";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { getConfidenceColor } from "@/lib/domain/rules";
import { redirect } from "next/navigation";

export default async function KeyResultDetailPage({
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
  const keyResult = snapshot.getKeyResult(id);
  if (!keyResult) redirect("/okr");
  const objective = snapshot.getObjective(keyResult.objectiveId);
  if (!objective || !canView(fullUser, objective.departmentId, keyResult.ownerId)) redirect("/okr");
  const owner = snapshot.getUser(keyResult.ownerId);
  const history = snapshot.listConfidenceHistory(keyResult.id);
  const latestScore = history.at(-1);
  const alignedObjectives = snapshot.listAlignedObjectives(keyResult.id, fullUser);
  const quarter = snapshot.getQuarter(objective.quarterId);
  const canManage =
    (fullUser.role === "super_admin" || keyResult.ownerId === fullUser.id || (fullUser.role === "dept_manager" && objective.departmentId === fullUser.departmentId)) &&
    (quarter.status === "planning" || fullUser.role === "super_admin");
  const canDelete = canManage && quarter.status === "planning";
  const readOnlyMessage =
    quarter.status === "archived"
      ? "季度已归档，KR 只读。"
      : quarter.status !== "planning" && fullUser.role !== "super_admin"
        ? "当前季度已进入执行阶段，仅超级管理员可继续调整 OKR。"
        : undefined;

  return (
    <>
      <PageHeader title="KR 详情" eyebrow={objective.title}>
        <a href="/okr" className="rounded-md border border-line bg-card px-3 py-2 text-sm font-medium text-steel hover:bg-hover">返回 OKR 树</a>
      </PageHeader>

      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted">Key Result</div>
            <h1 className="mt-2 text-xl font-semibold text-ink">{keyResult.description}</h1>
            <div className="mt-2 text-sm text-steel">负责人：{owner?.name ?? "未指定"}</div>
          </div>
          <StatusPill tone={getConfidenceColor(latestScore?.score)}>{latestScore ? `信心值 ${latestScore.score}` : "本周未更新"}</StatusPill>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Info label="起始值" value={`${keyResult.startValue}${keyResult.unit ?? ""}`} />
          <Info label="当前值" value={`${keyResult.currentValue}${keyResult.unit ?? ""}`} />
          <Info label="目标值" value={`${keyResult.targetValue}${keyResult.unit ?? ""}`} />
          <Info label="截止日期" value={keyResult.dueDate} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-line bg-card shadow-panel">
          <SectionHeader title="信心值历史" description="按周记录该 KR 的信心值变化。" />
          <div className="p-4">
            {history.length ? (
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {history.map((score) => (
                  <div key={score.id} className="rounded-md border border-line bg-hover p-2 text-center">
                    <div className="text-xs text-muted">第 {score.weekNumber} 周</div>
                    <div className="mt-1 text-lg font-semibold text-ink">{score.score}</div>
                    {score.note ? <div className="mt-1 line-clamp-2 text-xs text-steel">{score.note}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted">暂无信心值记录。</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-card shadow-panel">
          <SectionHeader title="对齐的下级 OKR" description="展示支撑该 KR 的部门级或个人级 Objective。" />
          <div className="divide-y divide-line">
            {alignedObjectives.length ? alignedObjectives.map((objective) => (
              <div key={objective.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="gray">{levelLabel(objective.level)}</StatusPill>
                  <a href={`/objectives/${objective.id}`} className="font-semibold text-ink underline-offset-2 hover:text-primary hover:underline">
                    {objective.title}
                  </a>
                  <div className="text-sm text-steel">负责人：{objective.owner?.name ?? "未指定"}</div>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-steel">
                  {objective.keyResults.map((childKr) => (
                    <li key={childKr.id}>
                      - <a href={`/key-results/${childKr.id}`} className="underline-offset-2 hover:text-primary hover:underline">{childKr.description}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )) : (
              <div className="p-4 text-sm text-muted">暂无下级 OKR 对齐到该 KR。</div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4">
        <KeyResultManagementPanel
          keyResultId={keyResult.id}
          initialValues={{
            description: keyResult.description,
            startValue: keyResult.startValue,
            currentValue: keyResult.currentValue,
            targetValue: keyResult.targetValue,
            unit: keyResult.unit,
            dueDate: keyResult.dueDate
          }}
          canEdit={canManage}
          canDelete={canDelete}
          isReadOnly={quarter.status === "archived"}
          readOnlyMessage={readOnlyMessage}
        />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-hover p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-semibold text-ink">{value}</div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-line px-4 py-3">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-steel">{description}</p>
    </div>
  );
}

function levelLabel(level: string) {
  return level === "company" ? "公司级" : level === "department" ? "部门级" : "个人级";
}

function canView(user: { id: string; role: string; departmentId?: string }, departmentId: string | undefined, ownerId: string) {
  return user.role === "super_admin" || ownerId === user.id || departmentId === user.departmentId;
}
