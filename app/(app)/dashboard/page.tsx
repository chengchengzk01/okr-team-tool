import { EmptyGuidanceCard } from "@/components/empty-guidance-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { OkrTree } from "@/components/okr-tree";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; userId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const quarters = (await prismaQueries.listQuarters()) ?? repository.listQuarters();
  if (quarters.length === 0) {
    return <DashboardInitializationState role={user.role} />;
  }
  const dashboard = (await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id);
  const requestedView = params.view === "team" || params.view === "company" ? params.view : "personal";
  const view = requestedView === "company" && dashboard.user.role !== "super_admin" ? "team" : requestedView;
  const selectedUserId = params.userId && canViewPersonalDashboard(dashboard, params.userId) ? params.userId : user.id;
  const currentCommitment = dashboard.commitments.find((item) => item.userId === selectedUserId);
  const currentCelebration = dashboard.celebrations.find((item) => item.userId === selectedUserId);
  const selectedUser = dashboard.visibleUsers.find((item) => item.id === selectedUserId) ?? dashboard.user;
  const timeLabel = formatDashboardTimeLabel(new Date(dashboard.currentDate), dashboard.quarter.name);
  const confidenceAlerts = ((await prismaQueries.listConfidenceAlerts(dashboard.user, dashboard.quarter.id)) ?? repository.listConfidenceAlerts(dashboard.user, dashboard.quarter.id)).slice(0, 3);

  return (
    <>
      <PageHeader title="四象限周报看板" eyebrow={timeLabel}>
        <StatusPill tone="blue">{dashboard.quarter.status}</StatusPill>
      </PageHeader>
      {!dashboard.okrTree.length && !dashboard.commitments.length && !dashboard.celebrations.length && !dashboard.healthMetrics.length ? (
        <div className="mb-4">
          <EmptyGuidanceCard
            title="当前看板还没有可展示的业务数据"
            description={
              dashboard.user.role === "super_admin"
                ? "看板依赖 OKR、周仪式和健康指标数据。你可以先去设置页补一套演示数据，或先创建季度内的真实 OKR。"
                : "当前账号可见范围内还没有足够数据生成看板。你可以先补个人 OKR、填写周仪式，或联系管理员补演示数据。"
            }
            actions={
              dashboard.user.role === "super_admin"
                ? [
                    { href: "/settings", label: "去补演示数据" },
                    { href: "/okr", label: "去查看 OKR", tone: "secondary" }
                  ]
                : [
                    { href: "/okr", label: "去查看 OKR" },
                    { href: "/weekly", label: "去填周仪式", tone: "secondary" }
                  ]
            }
          />
        </div>
      ) : null}
      <DashboardTabs view={view} canViewCompany={dashboard.user.role === "super_admin"} />
      {view === "team" ? (
        <TeamDashboardGrid dashboard={dashboard} />
      ) : view === "company" ? (
        <CompanyDashboardSummary dashboard={dashboard} />
      ) : (
      <div className="grid gap-4 lg:h-[calc(100vh-168px)] lg:min-h-[560px] lg:grid-cols-2 lg:grid-rows-2">
        <Panel title={`左上 · 本周承诺（${selectedUser.name}）`}>
          {currentCommitment ? (
            <ol className="space-y-3 text-sm">
              {[currentCommitment.priority1, currentCommitment.priority2, currentCommitment.priority3].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-semibold text-primary">Top {index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty text="本周承诺尚未提交" href="/weekly" />
          )}
        </Panel>
        <Panel title="右上 · 本季度 OKR 与信心值">
          {confidenceAlerts.length ? (
            <div className="mb-4 rounded-md border border-line bg-hover p-3">
              <div className="mb-2 text-xs font-semibold text-muted">V2.0 趋势预警</div>
              <div className="space-y-2">
                {confidenceAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 text-sm">
                    <a href={`/key-results/${alert.keyResultId}`} className="min-w-0 truncate font-medium text-ink underline-offset-2 hover:text-primary hover:underline">
                      {alert.keyResultDescription}
                    </a>
                    <StatusPill tone={alert.severity === "critical" ? "red" : alert.severity === "missing" ? "gray" : "yellow"}>
                      {alertReasonLabel(alert.reason)}
                    </StatusPill>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <OkrTree nodes={dashboard.okrTree} />
        </Panel>
        <Panel title={`左下 · 当周心情（${selectedUser.name}）`}>
          {currentCelebration ? (
            <div>
              <StatusPill tone="blue">{moodLabel(currentCelebration.mood)}</StatusPill>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm">
                {currentCelebration.achievements.map((item) => (
                  <li key={item.text}>{item.text}</li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty text="本周心情尚未提交" href="/weekly" />
          )}
        </Panel>
        <Panel title="右下 · 健康指标">
          <div className="space-y-3">
            {dashboard.healthMetrics.map((metric) => (
              <div
                key={metric.id}
                className={`rounded-md border p-3 ${metric.latestRecord?.status === "exceeded" ? "border-status-red bg-status-red-bg" : "border-line bg-card"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <a href={`/health/${metric.id}`} className="font-medium text-ink underline-offset-2 hover:text-primary hover:underline">
                    {metric.name}
                  </a>
                  <StatusPill tone={metric.latestRecord?.status === "healthy" ? "green" : metric.latestRecord?.status === "warning" ? "yellow" : "red"}>
                    {metric.latestRecord?.status ?? "未记录"}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-steel">当前健康度：{formatHealthScore(metric.latestRecord?.currentValue)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      )}
    </>
  );
}

function DashboardInitializationState({ role }: { role: "super_admin" | "dept_manager" | "member" }) {
  const isAdmin = role === "super_admin";

  return (
    <>
      <PageHeader title="系统初始化" eyebrow="首次上线后的必要步骤" />
      <section className="rounded-lg border border-line bg-card p-6 shadow-panel">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-ink">当前还没有可用季度</h2>
          <p className="mt-3 text-sm leading-6 text-steel">
            飞书登录已经完成，但数据库里还没有创建季度，所以看板暂时没有可展示的业务数据。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {isAdmin ? (
              <>
                <a href="/quarters" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
                  进入季度管理
                </a>
                <a href="/settings" className="rounded-md border border-line px-4 py-2 text-sm font-medium text-steel">
                  进入系统设置
                </a>
              </>
            ) : (
              <a href="/login" className="rounded-md border border-line px-4 py-2 text-sm font-medium text-steel">
                返回登录页
              </a>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            {isAdmin ? "建议先创建季度，再继续组织同步、日历和多维表格收口。" : "请联系超级管理员先完成季度初始化。"}
          </p>
        </div>
      </section>
    </>
  );
}

type DashboardData = ReturnType<typeof repository.getDashboard>;

function DashboardTabs({ view, canViewCompany }: { view: "personal" | "team" | "company"; canViewCompany: boolean }) {
  const tabs = [
    { href: "/dashboard?view=personal", value: "personal", label: "个人看板" },
    { href: "/dashboard?view=team", value: "team", label: "团队看板" },
    ...(canViewCompany ? [{ href: "/dashboard?view=company", value: "company", label: "全公司看板" }] : [])
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <a
          key={tab.value}
          href={tab.href}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            view === tab.value ? "border-primary bg-primary-light text-primary" : "border-line bg-card text-steel hover:bg-hover"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}

function TeamDashboardGrid({ dashboard }: { dashboard: DashboardData }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dashboard.visibleUsers.map((user) => {
        const commitment = dashboard.commitments.find((item) => item.userId === user.id);
        const celebration = dashboard.celebrations.find((item) => item.userId === user.id);
        return (
          <a key={user.id} href={`/dashboard?view=personal&userId=${user.id}`} className="rounded-lg border border-line bg-card p-4 shadow-panel transition hover:border-primary">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">{user.name}</div>
                <div className="mt-1 text-xs text-muted">{roleLabel(user.role)}</div>
              </div>
              <StatusPill tone={celebration ? "blue" : "gray"}>{celebration ? moodLabel(celebration.mood) : "未提交心情"}</StatusPill>
            </div>
            <div className="mt-4 min-h-24 rounded-md border border-line bg-hover p-3">
              {commitment ? (
                <ol className="space-y-2 text-sm text-steel">
                  {[commitment.priority1, commitment.priority2, commitment.priority3].map((item, index) => (
                    <li key={item} className="line-clamp-1"><span className="font-semibold text-primary">Top {index + 1}</span> {item}</li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-muted">本周承诺尚未提交</div>
              )}
            </div>
            <div className="mt-3 min-h-16 rounded-md border border-line bg-card p-3">
              {celebration ? (
                <div>
                  <div className="text-xs font-medium text-muted">完成事项</div>
                  <ul className="mt-2 space-y-1 text-xs text-steel">
                    {celebration.achievements.slice(0, 3).map((item) => (
                      <li key={item.text} className="line-clamp-1">{item.text}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-muted">周五庆祝尚未提交</div>
              )}
            </div>
          </a>
        );
      })}
    </section>
  );
}

function CompanyDashboardSummary({ dashboard }: { dashboard: DashboardData }) {
  const departmentRows = dashboard.visibleUsers.reduce<Record<string, { name: string; total: number; commitments: number; celebrations: number }>>((rows, user) => {
    const departmentId = user.departmentId ?? "unknown";
    rows[departmentId] ??= { name: departmentName(departmentId), total: 0, commitments: 0, celebrations: 0 };
    rows[departmentId].total += 1;
    if (dashboard.commitments.some((item) => item.userId === user.id)) rows[departmentId].commitments += 1;
    if (dashboard.celebrations.some((item) => item.userId === user.id)) rows[departmentId].celebrations += 1;
    return rows;
  }, {});

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel title="全公司 · 部门周仪式提交概览">
        <div className="space-y-3">
          {Object.entries(departmentRows).map(([departmentId, row]) => (
            <div key={departmentId} className="rounded-md border border-line bg-hover p-3">
              <div className="font-semibold text-ink">{row.name}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-steel">
                <div>成员 {row.total}</div>
                <div>承诺 {row.commitments}/{row.total}</div>
                <div>庆祝 {row.celebrations}/{row.total}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="全公司 · OKR 与健康指标">
        <div className="mb-4">
          <OkrTree nodes={dashboard.okrTree} />
        </div>
        <div className="space-y-3">
          {dashboard.healthMetrics.map((metric) => (
            <div key={metric.id} className={`rounded-md border p-3 ${metric.latestRecord?.status === "exceeded" ? "border-status-red bg-status-red-bg" : "border-line bg-card"}`}>
              <div className="flex items-center justify-between gap-3">
                <a href={`/health/${metric.id}`} className="font-medium text-ink underline-offset-2 hover:text-primary hover:underline">
                  {metric.name}
                </a>
                <StatusPill tone={metric.latestRecord?.status === "healthy" ? "green" : metric.latestRecord?.status === "warning" ? "yellow" : metric.latestRecord?.status === "exceeded" ? "red" : "gray"}>
                  {metric.latestRecord?.status ?? "未记录"}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-dashboard-panel="true" className="flex min-h-[240px] flex-col overflow-hidden rounded-lg border border-line bg-card shadow-panel lg:min-h-0">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

function Empty({ text, href }: { text: string; href: string }) {
  return (
    <EmptyGuidanceCard
      title={text}
      description="补齐对应页面的数据后，这个象限会自动恢复展示。"
      actions={[{ href, label: "快速进入" }]}
    />
  );
}

function canViewPersonalDashboard(dashboard: DashboardData, userId: string) {
  if (dashboard.user.role === "super_admin") return dashboard.visibleUsers.some((user) => user.id === userId);
  return dashboard.visibleUsers.some((user) => user.id === userId && user.departmentId === dashboard.user.departmentId);
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: "超级管理员",
    dept_manager: "部门管理者",
    member: "成员"
  };
  return labels[role] ?? role;
}

function departmentName(departmentId: string) {
  const labels: Record<string, string> = {
    "dept-company": "公司",
    "dept-product": "产品部",
    "dept-sales": "销售部",
    unknown: "未分配部门"
  };
  return labels[departmentId] ?? departmentId;
}

function moodLabel(mood: string) {
  const labels: Record<string, string> = {
    energized: "充满能量",
    steady: "稳步前进",
    calm: "平静",
    tired: "有些疲惫",
    need_support: "需要支持"
  };
  return labels[mood] ?? mood;
}

function alertReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    low_score: "低信心值",
    medium_score: "信心值需关注",
    declining_trend: "连续下降",
    progress_lagging: "进度滞后",
    missing_this_week: "本周未提交"
  };
  return labels[reason] ?? reason;
}

function formatHealthScore(value: number | undefined) {
  return value === undefined ? "-" : value.toFixed(1);
}

function formatDashboardTimeLabel(currentDate: Date, quarterName: string) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const quarter = quarterName.match(/Q[1-4]/)?.[0] ?? `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
  const weekNumber = getIsoWeekNumber(currentDate);
  const { start, end } = getWeekRange(currentDate);

  return `${year}年 · ${quarter} · ${month}月 · 全年第${weekNumber}周（${formatMonthDay(start)}到${formatMonthDay(end)}）`;
}

function getWeekRange(date: Date) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getIsoWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
