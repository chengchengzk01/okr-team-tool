import { EmptyGuidanceCard } from "@/components/empty-guidance-card";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { redirect } from "next/navigation";
import { WeeklyRitualForms } from "@/components/weekly-ritual-forms";

export default async function WeeklyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) redirect("/login");
  const dashboard = (await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id);
  const commitment = dashboard.commitments.find((item) => item.userId === user.id);
  const previousCommitment = (await prismaQueries.getPreviousWeeklyCommitment(user.id, dashboard.quarter.id, dashboard.weekNumber)) ?? repository.getPreviousWeeklyCommitment(user.id, dashboard.quarter.id, dashboard.weekNumber);
  const celebration = dashboard.celebrations.find((item) => item.userId === user.id);
  const keyResults = (await prismaQueries.listKeyResultsForUser(user.id, dashboard.quarter.id)) ?? repository.listKeyResultsForUser(user.id, dashboard.quarter.id);
  const obstacles =
    fullUser.role === "dept_manager" || fullUser.role === "super_admin"
      ? (await prismaQueries.listWeeklyObstacles(fullUser, dashboard.quarter.id, dashboard.weekNumber)) ?? repository.listWeeklyObstacles(fullUser, dashboard.quarter.id, dashboard.weekNumber)
      : [];
  const canViewObstacles = fullUser.role === "dept_manager" || fullUser.role === "super_admin";

  return (
    <>
      <PageHeader title="周仪式入口" eyebrow={`${dashboard.quarter.name} · 第 ${dashboard.weekNumber} 周`} />
      {!keyResults.length ? (
        <div className="mb-4">
          <EmptyGuidanceCard
            title="你当前还没有可更新的 KR"
            description={
              fullUser.role === "super_admin"
                ? "周仪式页已经可用，但当前账号还没有挂到任何 KR，所以信心值区会是空的。你可以先补一套演示数据，或先去 OKR 页创建 Objective 与 KR。"
                : "周仪式页已经可用，但当前账号还没有分配到 KR，所以暂时无法更新信心值。可以先去 OKR 页补个人 OKR，或联系管理员补演示数据。"
            }
            actions={
              fullUser.role === "super_admin"
                ? [
                    { href: "/settings", label: "去补演示数据" },
                    { href: "/okr", label: "去创建 OKR", tone: "secondary" }
                  ]
                : [{ href: "/okr", label: "去查看 OKR" }]
            }
            tip="即使还没有 KR，你仍然可以先填写周一承诺和周五庆祝，后续再补信心值链路。"
          />
        </div>
      ) : null}
      <WeeklyRitualForms
        quarterId={dashboard.quarter.id}
        weekNumber={dashboard.weekNumber}
        commitment={commitment}
        previousCommitment={previousCommitment}
        celebration={celebration}
        keyResults={keyResults}
      />
      {canViewObstacles ? (
        <section className="mt-4 rounded-lg border border-line bg-card shadow-panel">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">本周障碍汇总</h2>
            <p className="mt-1 text-sm text-steel">聚合展示当前可见范围内成员本周上报的非空障碍，便于部门管理者快速跟进。</p>
          </div>
          {obstacles.length ? (
            <div className="divide-y divide-line">
              {obstacles.map((item) => (
                <div key={`${item.user?.id ?? "unknown"}-${item.submittedAt}`} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-ink">{item.user?.name ?? "未命名成员"}</div>
                    <div className="text-xs text-muted">{formatDateTime(item.submittedAt)}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">{item.obstacles}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6">
              <EmptyGuidanceCard
                title="本周还没有障碍上报"
                description="这通常表示当前可见成员还没有在周五庆祝里填写障碍，或本周还没开始录入周仪式。"
                actions={[
                  { href: "/weekly", label: "继续填写本周仪式" },
                  ...(fullUser.role === "super_admin" ? [{ href: "/settings", label: "先补演示数据", tone: "secondary" as const }] : [])
                ]}
              />
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
